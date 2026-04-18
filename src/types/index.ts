/**
 * TYPES BARREL: index.ts
 * --------------------------------------------------------------
 * CURRENT ROLE:
 *  - Central re-export (barrel) aggregating discrete domain type modules.
 *  - Provides a stable import path `@/types` for core domain entities.
 *
 * MIGRATION PLAN:
 *  - When backend schemas (OpenAPI/GraphQL/Zod) are introduced, generate or validate
 *    these interfaces against those schemas.
 *  - If codegen is adopted, keep this barrel but re-export from generated folder
 *    (e.g. `export * from '../generated/types/user';`).
 *
 * FUTURE:
 *  - Add sub-domain barrels if the list grows large (e.g. `@/types/events`).
 *  - Introduce utility generic response wrappers (Paginated<T>, ApiError).
 */
export * from './user';
export * from './event';
export * from './organizer';

// NOTE: If admin/internal-only types are added later (e.g. AdminUser), prefer a
// separate file (adminUser.ts) and explicit export here to avoid leaking internal
// implementation details inadvertently.
export * from './transaction';
