package conn

import (
	"errors"
	"strings"
	"sync"
	"time"

	"github.com/gw123/glog"
	"gorm.io/driver/mysql"
	"gorm.io/driver/postgres"
	"gorm.io/driver/sqlite"
	"gorm.io/driver/sqlserver"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"

	"github.com/gw123/gflow/plugins/gorm/loggerx"
)

type Config struct {
	Driver          string
	DSN             string
	Alias           string
	DebugPrint      bool
	DebugLevel      string
	SlowThresholdMs int64
}

type Manager struct {
	mu    sync.RWMutex
	conns map[string]*gorm.DB
}

func NewManager() *Manager {
	return &Manager{
		conns: make(map[string]*gorm.DB),
	}
}

func (m *Manager) GetOrInit(cfg Config) (*gorm.DB, error) {
	if cfg.Alias == "" {
		cfg.Alias = cfg.Driver + "::" + cfg.DSN
	}
	m.mu.RLock()
	db, ok := m.conns[cfg.Alias]
	m.mu.RUnlock()
	if ok {
		return db, nil
	}
	m.mu.Lock()
	defer m.mu.Unlock()
	if db, ok := m.conns[cfg.Alias]; ok {
		return db, nil
	}
	glog.Log().Named("gorm").Infof("init connection alias=%s driver=%s", cfg.Alias, cfg.Driver)
	db, err := m.open(cfg)
	if err != nil {
		return nil, err
	}
	m.conns[cfg.Alias] = db
	return db, nil
}

func (m *Manager) open(cfg Config) (*gorm.DB, error) {
	var dialector gorm.Dialector
	switch strings.ToLower(cfg.Driver) {
	case "mysql":
		dialector = mysql.Open(cfg.DSN)
	case "postgres", "postgresql":
		dialector = postgres.Open(cfg.DSN)
	case "sqlite", "sqlite3":
		dialector = sqlite.Open(cfg.DSN)
	case "sqlserver", "mssql":
		dialector = sqlserver.Open(cfg.DSN)
	default:
		return nil, errors.New("unsupported driver")
	}
	lvl := logger.Silent
	switch strings.ToLower(cfg.DebugLevel) {
	case "error":
		lvl = logger.Error
	case "warn":
		lvl = logger.Warn
	case "info":
		lvl = logger.Info
	}
	glogLogger := loggerx.NewGlogLogger(lvl, time.Duration(cfg.SlowThresholdMs)*time.Millisecond, cfg.DebugPrint)
	db, err := gorm.Open(dialector, &gorm.Config{
		Logger: glogLogger,
	})
	if err != nil {
		return nil, err
	}
	sqlDB, err := db.DB()
	if err == nil && sqlDB != nil {
		sqlDB.SetMaxOpenConns(50)
		sqlDB.SetMaxIdleConns(10)
		sqlDB.SetConnMaxLifetime(time.Hour)
	}
	return db, nil
}
