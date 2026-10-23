-- LaLiga EA Sports 2026/27 team details.
-- Foundation years: official LALIGA club list (source: https://www.laliga.com/en-US/laliga-easports/clubs).
-- Stadium capacities: published 2026/27 figures (source: https://www.eldesmarque.com/futbol/liga-1a-division/20260623/clasificacion-estadios-laliga-2026-2027-capacidad_18_019517477.html).
-- Several venues are under construction; capacities are the latest published figures available,
-- not necessarily the number of seats open for every individual match.
-- Run after 20261022_add_team_foundation_and_stadium_capacity.sql.

WITH team_metadata(team_id, expected_name, foundation_year, stadium_capacity) AS (
  VALUES
    (2,  'Real Madrid CF.',                         1902, 79000),
    (3,  'FC. Barcelona',                           1899, 62652),
    (13, 'Villarreal CF.',                           1923, 21332),
    (5,  'Real Betis Balompie',                      1907, 68887),
    (18, 'Club Atlético de Madrid',                  1903, 70692),
    (12, 'Racing de Santander',                      1913, 22514),
    (4,  'Sevilla FC.',                              1890, 43883),
    (24, 'Valencia CF.',                             1919, 49430),
    (17, 'Elche CF.',                                1923, 31388),
    (11, 'Rayo Vallecano',                           1924, 14708),
    (15, 'Levante UD.',                              1909, 26354),
    (20, 'Athletic Club',                            1898, 53331),
    (9,  'Deportivo Alavés',                         1921, 19840),
    (10, 'Getafe CF.',                               1983, 16500),
    (16, 'RC. Deportivo de A Coruña',                1906, 32490),
    (19, 'Málaga CF.',                               1994, 30044),
    (23, 'CA. Osasuna',                              1920, 23576),
    (21, 'Real Sociedad de Fútbol',                  1909, 39313),
    (22, 'RC. Celta de Vigo',                        1923, 23000),
    (14, 'RCD. Espanyol',                            1900, 40500)
)
UPDATE public.teams AS teams
SET foundation_year = metadata.foundation_year,
    stadium_capacity = metadata.stadium_capacity
FROM team_metadata AS metadata
WHERE teams.id = metadata.team_id
  AND teams.name = metadata.expected_name;

-- Rayo's current home is Vallecas; its stored Butarque ground was a temporary venue.
UPDATE public.teams
SET stadium = 'Estadio de Vallecas'
WHERE id = 11 AND name = 'Rayo Vallecano' AND stadium = 'Butarque';
