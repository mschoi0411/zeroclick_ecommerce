export const prismaPackageInfo = {
  provider: 'mysql',
  notes: 'Prisma schema is scaffolded for MySQL. Run prisma generate after setting MYSQL_URL.',
};

export type DeferredDatabaseMode = 'mock' | 'mysql';

export const deferredDatabaseMode: DeferredDatabaseMode = 'mock';
