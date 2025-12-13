package loggerx

import (
	"context"
	"time"

	"github.com/gw123/glog"
	"gorm.io/gorm/logger"
)

type GlogLogger struct {
	level         logger.LogLevel
	slowThreshold time.Duration
	printSQL      bool
}

func NewGlogLogger(level logger.LogLevel, slowThreshold time.Duration, printSQL bool) logger.Interface {
	return &GlogLogger{
		level:         level,
		slowThreshold: slowThreshold,
		printSQL:      printSQL,
	}
}

func (l *GlogLogger) LogMode(level logger.LogLevel) logger.Interface {
	l.level = level
	return l
}

func (l *GlogLogger) Info(ctx context.Context, msg string, data ...interface{}) {
	if l.level >= logger.Info {
		glog.Log().Named("gorm").Infof(msg, data...)
	}
}

func (l *GlogLogger) Warn(ctx context.Context, msg string, data ...interface{}) {
	if l.level >= logger.Warn {
		glog.Log().Named("gorm").Warnf(msg, data...)
	}
}

func (l *GlogLogger) Error(ctx context.Context, msg string, data ...interface{}) {
	if l.level >= logger.Error {
		glog.Log().Named("gorm").Errorf(msg, data...)
	}
}

func (l *GlogLogger) Trace(ctx context.Context, begin time.Time, fc func() (string, int64), err error) {
	elapsed := time.Since(begin)
	sql, rows := fc()
	if err != nil {
		if l.level >= logger.Error {
			glog.Log().Named("gorm").WithField("rows", rows).WithField("cost_ms", elapsed.Milliseconds()).Errorf("err=%v sql=%s", err, sql)
		}
		return
	}
	if l.slowThreshold > 0 && elapsed > l.slowThreshold {
		if l.level >= logger.Warn {
			glog.Log().Named("gorm").WithField("rows", rows).WithField("cost_ms", elapsed.Milliseconds()).Warnf("slow sql=%s", sql)
		}
		return
	}
	if l.printSQL && l.level >= logger.Info {
		glog.Log().Named("gorm").WithField("rows", rows).WithField("cost_ms", elapsed.Milliseconds()).Infof("sql=%s", sql)
	}
}
