package debugx

import (
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

type Options struct {
	Print           bool
	Capture         bool
	Level           logger.LogLevel
	SlowThresholdMs int64
}

func CaptureSQL(db *gorm.DB, build func(*gorm.DB) *gorm.DB) (string, []interface{}) {
	tx := build(db.Session(&gorm.Session{DryRun: true}))
	stmt := tx.Statement
	sql := stmt.SQL.String()
	return sql, stmt.Vars
}
