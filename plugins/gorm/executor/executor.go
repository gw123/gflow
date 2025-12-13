package executor

import (
	"errors"
	"fmt"
	"strings"

	"gorm.io/gorm"

	"github.com/gw123/gflow/plugins/gorm/builder"
)

type Params interface {
	GetTable() string
	GetTableAlias() string
	GetSelect() []string
	GetJoins() []builder.JoinExpr
	GetWhere() []builder.WhereExpr
	GetGroupBy() []string
	GetHaving() []builder.WhereExpr
	GetOrderBy() []builder.OrderExpr
	GetLimit() int
	GetOffset() int
	GetPage() int
	GetPageSize() int
	GetCalcTotal() bool
	GetAggregations() []AggExpr
	GetUpdateData() map[string]interface{}
	GetCreateData() []map[string]interface{}
	GetRawSQL() string
	GetRawVars() []interface{}
	GetAllowFullTable() bool
}

type AggExpr struct {
	Func  string
	Field string
	Alias string
}

type Result struct {
	Rows       []map[string]interface{}
	Row        map[string]interface{}
	Total      int64
	Page       int
	PageSize   int
	Aggregates map[string]interface{}
	Affected   int64
}

func buildAggSelect(aggs []AggExpr) string {
	if len(aggs) == 0 {
		return ""
	}
	parts := make([]string, 0, len(aggs))
	for _, a := range aggs {
		fn := strings.ToUpper(strings.TrimSpace(a.Func))
		if a.Alias != "" {
			parts = append(parts, fmt.Sprintf("%s(%s) AS %s", fn, a.Field, a.Alias))
		} else {
			parts = append(parts, fmt.Sprintf("%s(%s)", fn, a.Field))
		}
	}
	return strings.Join(parts, ", ")
}

func ExecFind(db *gorm.DB, p Params, driver string) (Result, error) {
	base, err := builder.BuildBaseQuery(db, p, driver)
	if err != nil {
		return Result{}, err
	}
	page := p.GetPage()
	pageSize := p.GetPageSize()
	limit := p.GetLimit()
	offset := p.GetOffset()
	if page > 0 && pageSize > 0 {
		limit = pageSize
		offset = (page - 1) * pageSize
	}
	if limit > 0 {
		base = base.Limit(limit)
	}
	if offset > 0 {
		base = base.Offset(offset)
	}
	rows := []map[string]interface{}{}
	if err := base.Find(&rows).Error; err != nil {
		return Result{}, err
	}
	res := Result{Rows: rows, Page: page, PageSize: pageSize}
	if p.GetCalcTotal() {
		cntBase, err := builder.BuildBaseQuery(db, p, driver)
		if err != nil {
			return Result{}, err
		}
		var total int64
		if err := cntBase.Count(&total).Error; err != nil {
			return Result{}, err
		}
		res.Total = total
	}
	if len(p.GetAggregations()) > 0 {
		aggSel := buildAggSelect(p.GetAggregations())
		aggBase, err := builder.BuildBaseQuery(db, p, driver)
		if err != nil {
			return Result{}, err
		}
		aggRow := map[string]interface{}{}
		if aggSel != "" {
			if err := aggBase.Select(aggSel).Scan(&aggRow).Error; err != nil {
				return Result{}, err
			}
		}
		if len(aggRow) > 0 {
			res.Aggregates = make(map[string]interface{}, len(aggRow))
			for k, v := range aggRow {
				res.Aggregates[k] = v
			}
		}
	}
	return res, nil
}

func ExecFirst(db *gorm.DB, p Params, driver string) (Result, error) {
	base, err := builder.BuildBaseQuery(db, p, driver)
	if err != nil {
		return Result{}, err
	}
	row := map[string]interface{}{}
	if err := base.Limit(1).Find(&row).Error; err != nil {
		return Result{}, err
	}
	return Result{Row: row}, nil
}

func ExecCount(db *gorm.DB, p Params, driver string) (Result, error) {
	base, err := builder.BuildBaseQuery(db, p, driver)
	if err != nil {
		return Result{}, err
	}
	var total int64
	if err := base.Count(&total).Error; err != nil {
		return Result{}, err
	}
	return Result{Total: total}, nil
}

func ExecAggregate(db *gorm.DB, p Params, driver string) (Result, error) {
	aggSel := buildAggSelect(p.GetAggregations())
	if aggSel == "" {
		return Result{}, errors.New("empty aggregations")
	}
	base, err := builder.BuildBaseQuery(db, p, driver)
	if err != nil {
		return Result{}, err
	}
	row := map[string]interface{}{}
	if err := base.Select(aggSel).Scan(&row).Error; err != nil {
		return Result{}, err
	}
	res := Result{Aggregates: make(map[string]interface{}, len(row))}
	for k, v := range row {
		res.Aggregates[k] = v
	}
	return res, nil
}

func ExecCreate(db *gorm.DB, p Params) (Result, error) {
	data := p.GetCreateData()
	if len(data) == 0 {
		return Result{}, errors.New("empty create_data")
	}
	tx := db.Table(p.GetTable()).Create(&data)
	return Result{Affected: tx.RowsAffected}, tx.Error
}

func ExecUpdate(db *gorm.DB, p Params, driver string) (Result, error) {
	if len(p.GetWhere()) == 0 && !p.GetAllowFullTable() {
		return Result{}, errors.New("unsafe update without where")
	}
	base, err := builder.BuildBaseQuery(db, p, driver)
	if err != nil {
		return Result{}, err
	}
	tx := base.Updates(p.GetUpdateData())
	return Result{Affected: tx.RowsAffected}, tx.Error
}

func ExecDelete(db *gorm.DB, p Params, driver string) (Result, error) {
	if len(p.GetWhere()) == 0 && !p.GetAllowFullTable() {
		return Result{}, errors.New("unsafe delete without where")
	}
	base, err := builder.BuildBaseQuery(db, p, driver)
	if err != nil {
		return Result{}, err
	}
	tx := base.Delete(nil)
	return Result{Affected: tx.RowsAffected}, tx.Error
}

func ExecRaw(db *gorm.DB, p Params) (Result, error) {
	sql := strings.TrimSpace(strings.ToLower(p.GetRawSQL()))
	isQuery := strings.HasPrefix(sql, "select") || strings.HasPrefix(sql, "with") || strings.HasPrefix(sql, "show") || strings.HasPrefix(sql, "pragma")
	if isQuery {
		rows := []map[string]interface{}{}
		if err := db.Raw(p.GetRawSQL(), p.GetRawVars()...).Scan(&rows).Error; err != nil {
			return Result{}, err
		}
		return Result{Rows: rows}, nil
	}
	tx := db.Exec(p.GetRawSQL(), p.GetRawVars()...)
	return Result{Affected: tx.RowsAffected}, tx.Error
}
