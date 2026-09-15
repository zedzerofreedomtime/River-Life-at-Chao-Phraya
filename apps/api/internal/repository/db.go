package repository

import (
	"context"
	_ "embed"
	"github.com/jackc/pgx/v5/pgxpool"
)

//go:embed schema.sql
var schema string

const zoneStructureMigration = `
UPDATE zones SET name='หัวเรือ', capacity=100, price=180000 WHERE id='A';
UPDATE zones SET name='ท้ายเรือ', capacity=150, price=150000 WHERE id='B';
UPDATE zones SET name='ชั้นล่าง', capacity=100, price=120000 WHERE id='C';
INSERT INTO schema_migrations(version) VALUES(2) ON CONFLICT DO NOTHING;
`

func Open(ctx context.Context, url string) (*pgxpool.Pool, error) {
	db, err := pgxpool.New(ctx, url)
	if err != nil {
		return nil, err
	}
	if err = db.Ping(ctx); err != nil {
		db.Close()
		return nil, err
	}
	// Serialize bootstrap across replicas; migrations are versioned and transactional.
	tx, err := db.Begin(ctx)
	if err != nil {
		db.Close()
		return nil, err
	}
	defer tx.Rollback(ctx)
	_, err = tx.Exec(ctx, "SELECT pg_advisory_xact_lock(820031)")
	if err == nil {
		_, err = tx.Exec(ctx, schema)
	}
	if err == nil {
		var version int
		err = tx.QueryRow(ctx, "SELECT COALESCE(MAX(version),0) FROM schema_migrations").Scan(&version)
		if err == nil && version < 2 {
			_, err = tx.Exec(ctx, zoneStructureMigration)
		}
	}
	if err == nil {
		err = tx.Commit(ctx)
	}
	if err != nil {
		db.Close()
		return nil, err
	}
	return db, nil
}
