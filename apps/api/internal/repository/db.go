package repository

import (
	"context"
	_ "embed"
	"github.com/jackc/pgx/v5/pgxpool"
)

//go:embed schema.sql
var schema string

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
		err = tx.Commit(ctx)
	}
	if err != nil {
		db.Close()
		return nil, err
	}
	return db, nil
}
