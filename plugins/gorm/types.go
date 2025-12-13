package main

type DebugOptions struct {
	Print           bool
	Capture         bool
	Level           string
	SlowThresholdMs int64
}

type ConnConfig struct {
	Driver string
	DSN    string
	Alias  string
	Debug  DebugOptions
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

type AggExpr struct {
	Func  string
	Field string
	Alias string
}

type JoinOn struct {
	Expr   string
	Values []interface{}
}

type JoinExpr struct {
	Type  string
	Table string
	Alias string
	On    JoinOn
}

type OpSpec struct {
	Op         string
	Table      string
	Select     []string
	Where      []WhereExpr
	CreateData []map[string]interface{}
	UpdateData map[string]interface{}
	RawSQL     string
	RawVars    []interface{}
}

type Params struct {
	Conn           ConnConfig
	Op             string
	Table          string
	TableAlias     string
	Select         []string
	Joins          []JoinExpr
	Where          []WhereExpr
	GroupBy        []string
	Having         []WhereExpr
	OrderBy        []OrderExpr
	Limit          int
	Offset         int
	Page           int
	PageSize       int
	CalcTotal      bool
	Aggregations   []AggExpr
	CreateData     []map[string]interface{}
	UpdateData     map[string]interface{}
	RawSQL         string
	RawVars        []interface{}
	UseTx          bool
	BatchOps       []OpSpec
	Debug          DebugOptions
	AllowFullTable bool
}

func (p *Params) GetTable() string                        { return p.Table }
func (p *Params) GetTableAlias() string                   { return p.TableAlias }
func (p *Params) GetSelect() []string                     { return p.Select }
func (p *Params) GetJoins() []JoinExpr                    { return p.Joins }
func (p *Params) GetWhere() []WhereExpr                   { return p.Where }
func (p *Params) GetGroupBy() []string                    { return p.GroupBy }
func (p *Params) GetHaving() []WhereExpr                  { return p.Having }
func (p *Params) GetOrderBy() []OrderExpr                 { return p.OrderBy }
func (p *Params) GetLimit() int                           { return p.Limit }
func (p *Params) GetOffset() int                          { return p.Offset }
func (p *Params) GetPage() int                            { return p.Page }
func (p *Params) GetPageSize() int                        { return p.PageSize }
func (p *Params) GetCalcTotal() bool                      { return p.CalcTotal }
func (p *Params) GetAggregations() []AggExpr              { return p.Aggregations }
func (p *Params) GetUpdateData() map[string]interface{}   { return p.UpdateData }
func (p *Params) GetCreateData() []map[string]interface{} { return p.CreateData }
func (p *Params) GetRawSQL() string                       { return p.RawSQL }
func (p *Params) GetRawVars() []interface{}               { return p.RawVars }
func (p *Params) GetAllowFullTable() bool                 { return p.AllowFullTable }

type Result struct {
	Rows       []map[string]interface{}
	Row        map[string]interface{}
	Total      int64
	Page       int
	PageSize   int
	Aggregates map[string]interface{}
	Affected   int64
	DebugSQL   string
	DebugVars  []interface{}
}
