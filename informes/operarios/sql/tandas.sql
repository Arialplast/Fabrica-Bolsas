-- Golpes de las cortadoras. Reemplazar __DESDE__ y __HASTA__ (timestamptz, ej. '2026-09-27 03:00+00').
select json_agg(json_build_object('id',id,'maquina',maquina,'inicio',inicio,'fin',fin,'golpes',golpes,'contador_fin',contador_fin,'sin_hora',sin_hora) order by fin,id) as d
from corte_tandas where fin >= '__DESDE__' and fin < '__HASTA__';
