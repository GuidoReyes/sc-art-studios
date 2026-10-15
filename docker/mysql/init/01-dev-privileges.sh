#!/bin/bash
# Solo desarrollo: `prisma migrate dev` crea una base "shadow" temporal, así que el
# usuario local necesita crear y borrar bases. En producción el usuario de la app
# tendrá privilegios mínimos sobre su propia base (docs/seguridad.md, capa 7).
set -euo pipefail
mysql --protocol=socket -uroot -p"${MYSQL_ROOT_PASSWORD}" <<SQL
GRANT CREATE, ALTER, DROP, INDEX, REFERENCES, SELECT, INSERT, UPDATE, DELETE ON *.* TO '${MYSQL_USER}'@'%';
FLUSH PRIVILEGES;
SQL
