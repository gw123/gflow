package builder

import (
	"fmt"
	"strings"

	"gorm.io/gorm"
)

type Params interface {
	GetTable() string
	GetTableAlias() string
	GetSelect() []string
	GetJoins() []JoinExpr
	GetWhere() []WhereExpr
	GetGroupBy() []string
	GetHaving() []WhereExpr
	GetOrderBy() []OrderExpr
}

type WhereExpr struct {
	Field  string
	Op     string
	Value  interface{}
	Expr   string
	Values []interface{}
}

type OrderExpr struct {
	Field string
	Dir   string
}

type JoinExpr struct {
	Type  string
	Table string
	Alias string
	On    struct {
		Expr   string
		Values []interface{}
	}
}

func BuildBaseQuery(db *gorm.DB, p Params, driver string) (*gorm.DB, error) {
	table := p.GetTable()
	alias := p.GetTableAlias()
	selects := p.GetSelect()
	joins := p.GetJoins()
	wheres := p.GetWhere()
	groupBy := p.GetGroupBy()
	having := p.GetHaving()
	orderBy := p.GetOrderBy()
	q := db
	if alias != "" {
		q = q.Table(fmt.Sprintf("%s AS %s", table, alias))
	} else {
		q = q.Table(table)
	}
	if len(selects) > 0 {
		q = q.Select(strings.Join(selects, ", "))
	}
	for _, j := range joins {
		t := strings.ToUpper(strings.TrimSpace(j.Type))
		if t == "" {
			t = "INNER"
		}
		clause := fmt.Sprintf("%s JOIN %s", t, j.Table)
		if j.Alias != "" {
			clause += " " + j.Alias
		}
		if j.On.Expr != "" {
			clause += " ON " + j.On.Expr
			q = q.Joins(clause, j.On.Values...)
		} else {
			q = q.Joins(clause)
		}
	}
	for _, w := range wheres {
		if w.Expr != "" {
			q = q.Where(w.Expr, w.Values...)
			continue
		}
		op := strings.ToLower(strings.TrimSpace(w.Op))
		switch op {
		case "eq":
			q = q.Where(fmt.Sprintf("%s = ?", w.Field), w.Value)
		case "ne":
			q = q.Where(fmt.Sprintf("%s <> ?", w.Field), w.Value)
		case "gt":
			q = q.Where(fmt.Sprintf("%s > ?", w.Field), w.Value)
		case "lt":
			q = q.Where(fmt.Sprintf("%s < ?", w.Field), w.Value)
		case "gte":
			q = q.Where(fmt.Sprintf("%s >= ?", w.Field), w.Value)
		case "lte":
			q = q.Where(fmt.Sprintf("%s <= ?", w.Field), w.Value)
		case "like":
			q = q.Where(fmt.Sprintf("%s LIKE ?", w.Field), w.Value)
		case "ilike":
			if driver == "postgres" || driver == "postgresql" {
				q = q.Where(fmt.Sprintf("%s ILIKE ?", w.Field), w.Value)
			} else {
				q = q.Where(fmt.Sprintf("%s LIKE ?", w.Field), w.Value)
			}
		case "in":
			q = q.Where(fmt.Sprintf("%s IN ?", w.Field), w.Value)
		case "between":
			if len(w.Values) >= 2 {
				q = q.Where(fmt.Sprintf("%s BETWEEN ? AND ?", w.Field), w.Values[0], w.Values[1])
			}
		case "isnull":
			q = q.Where(fmt.Sprintf("%s IS NULL", w.Field))
		case "notnull":
			q = q.Where(fmt.Sprintf("%s IS NOT NULL", w.Field))
		default:
			q = q.Where(fmt.Sprintf("%s %s ?", w.Field, strings.ToUpper(w.Op)), w.Value)
		}
	}
	if len(groupBy) > 0 {
		q = q.Group(strings.Join(groupBy, ", "))
	}
	for _, h := range having {
		if h.Expr != "" {
			q = q.Having(h.Expr, h.Values...)
			continue
		}
		op := strings.ToLower(strings.TrimSpace(h.Op))
		switch op {
		case "eq":
			q = q.Having(fmt.Sprintf("%s = ?", h.Field), h.Value)
		case "ne":
			q = q.Having(fmt.Sprintf("%s <> ?", h.Field), h.Value)
		case "gt":
			q = q.Having(fmt.Sprintf("%s > ?", h.Field), h.Value)
		case "lt":
			q = q.Having(fmt.Sprintf("%s < ?", h.Field), h.Value)
		case "gte":
			q = q.Having(fmt.Sprintf("%s >= ?", h.Field), h.Value)
		case "lte":
			q = q.Having(fmt.Sprintf("%s <= ?", h.Field), h.Value)
		default:
			q = q.Having(fmt.Sprintf("%s %s ?", h.Field, strings.ToUpper(h.Op)), h.Value)
		}
	}
	for _, o := range orderBy {
		dir := strings.ToUpper(strings.TrimSpace(o.Dir))
		if dir != "ASC" && dir != "DESC" {
			dir = "ASC"
		}
		q = q.Order(fmt.Sprintf("%s %s", o.Field, dir))
	}
	return q, nil
}
