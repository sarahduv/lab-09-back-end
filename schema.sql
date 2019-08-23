
-- run this file with psql -f schema.sql -d city_explorer

DROP TABLE IF EXISTS locations;

CREATE TABLE locations (
  id SERIAL PRIMARY KEY,
  search_query VARCHAR(255),
  formatted_query VARCHAR(255),
  latitude NUMERIC(10,7),
  longitude NUMERIC (10,7),
  created_at NUMERIC
);

DROP TABLE IF EXISTS weather;

CREATE TABLE weather (
  id SERIAL PRIMARY KEY,
  search_query VARCHAR(255),
  forecast VARCHAR,
  time VARCHAR(255),
  created_at NUMERIC
);

DROP TABLE IF EXISTS events;

CREATE TABLE events (
  id SERIAL PRIMARY KEY,
  search_query VARCHAR(255),
  link VARCHAR(255),
  name VARCHAR(255),
  event_date VARCHAR(255),
  summary VARCHAR,
  created_at NUMERIC
);


DROP TABLE IF EXISTS movies;

CREATE TABLE movies (
  id SERIAL PRIMARY KEY,
  search_query VARCHAR(255),
  title VARCHAR(255),
  overview VARCHAR,
  average_votes VARCHAR(255),
  total_votes VARCHAR(255),
  image_url VARCHAR(255),
  popularity VARCHAR(255),
  released_on VARCHAR(255),
  created_at NUMERIC
);

DROP TABLE IF EXISTS yelp;

CREATE TABLE yelp (
  id SERIAL PRIMARY KEY,
  search_query VARCHAR(255),
  name VARCHAR(255),
  image_url VARCHAR(255),
  price VARCHAR(255),
  rating VARCHAR(255),
  url VARCHAR(255),
  created_at NUMERIC
);

