'use strict';

// Requires
require('dotenv').config()
const express = require('express');
const cors = require('cors');
const superagent = require('superagent');
const app = express();
const pg = require('pg');

// Env variables
const GEOCODE_API_KEY = process.env.googleMapsAPI;
const WEATHER_API_KEY = process.env.darkSkyAPI;
const EVENTS_API_KEY = process.env.eventBriteAPI;
const MOVIE_API_KEY = process.env.movieAPI;
const YELP_API_KEY = process.env.yelpAPI;
const PORT = process.env.PORT;
const DATABASE_URL = process.env.DATABASE_URL;

app.use(cors());

const MS_IN_SEC = 1000;
const SEC_IN_HOUR = 3600;
const SEC_IN_DAY = 3600 * 24;

let movieStartUrl = 'https://image.tmdb.org/t/p/w500';

// Connect to database
const client = new pg.Client(DATABASE_URL);
client.connect();
client.on('error', (error) => console.log(error));

function Location(query, format, lat, lng){
  this.search_query = query;
  this.formatted_query = format;
  this.latitude = lat;
  this.longitude = lng;
}

function Day(summary, time){
  this.forecast = summary;
  this.time = new Date(time * MS_IN_SEC).toDateString();
}

function Eventbrite(url, name, date, summary){
  this.link = url;
  this.name = name;
  this.event_date = new Date(date).toDateString();
  this.summary = summary;
}

function Movie(title, overview, vote_average, vote_count, backdrop_path, popularity, release_date){
  this.title = title;
  this.overview = overview;
  this.average_votes=vote_average;
  this.total_votes = vote_count;
  this.image_url = 'https://image.tmdb.org/t/p/w500'+backdrop_path;
  this.popularity = popularity;
  this.released_on = release_date;
}

function Yelp()

function updateLocation(query, request, response) {
  const urlToVisit = `https://maps.googleapis.com/maps/api/geocode/json?address=${query}&key=${GEOCODE_API_KEY}`
  superagent.get(urlToVisit).then(responseFromSuper => {

    // I simply replaced my geodata require, with the data in the body of my superagent response
    const geoData = responseFromSuper.body;
    const specificGeoData = geoData.results[0];
    const newLocation = new Location(
      query,
      specificGeoData.formatted_address,
      specificGeoData.geometry.location.lat,
      specificGeoData.geometry.location.lng
    )

    //Logging data into the SQL DB
    const sqlQueryInsert = `
      INSERT INTO locations (search_query, formatted_query, latitude, longitude, created_at)
      VALUES ($1, $2, $3, $4, $5);`;
    const valuesArray = [newLocation.search_query, newLocation.formatted_query, newLocation.latitude, newLocation.longitude, now()];

    //client.query takes in a string and array and smooshes them into a proper sql statement that it sends to the db
    client.query(sqlQueryInsert, valuesArray);
    response.send(newLocation);        
  }).catch(error => {
    response.status(500).send(error.message);
    console.error(error);
  })
}

function updateWeather(query, request, response){
  const urlToVisit = `https://api.darksky.net/forecast/${WEATHER_API_KEY}/${request.query.data.latitude},${request.query.data.longitude}`
  superagent.get(urlToVisit).then(responseFromSuper => {        
    const formattedDays = responseFromSuper.body.daily.data.map(
      day => new Day(day.summary, day.time)
    );
    response.send(formattedDays);

    //Logging data into the SQL DB
    formattedDays.forEach(day => {
      const sqlQueryInsert = `
        INSERT INTO weather (search_query, forecast, time, created_at)
        VALUES ($1, $2, $3, $4);`;
      const valuesArray = [query.search_query, day.forecast, day.time, now()]

      //client.query takes in a string and array and smooshes them into a proper sql statement that it sends to the db
      client.query(sqlQueryInsert, valuesArray);
    })
  }).catch(error => {
    response.status(500).send(error.message);
    console.error(error);
  });
}

function updateEvents(query, request, response){
  const urlToVisit = `https://www.eventbriteapi.com/v3/events/search?location.longitude=${request.query.data.longitude}&location.latitude=${request.query.data.latitude}&token=${EVENTS_API_KEY}`;
  superagent.get(urlToVisit).then(responseFromSuper => {
    const formattedEvent = responseFromSuper.body.events.map(
      event => new Eventbrite(event.url, event.name.text, event.start.local, event.summary)
    );
    response.send(formattedEvent);
    //Logging data into the SQL DB
    formattedEvent.forEach(event => {
      const sqlQueryInsert = `
        INSERT INTO events (search_query, link, name, event_date, summary, created_at)
        VALUES ($1, $2, $3, $4, $5, $6);`;
      const valuesArray = [query.search_query, event.link, event.name, event.event_date, event.summary, now()];

      //client.query takes in a string and array and smooshes them into a proper sql statement that it sends to the db
      client.query(sqlQueryInsert, valuesArray);
    })
  }).catch(error => {
    response.status(500).send(error.message);
    console.error(error);
  })
}

//update movies
function updateMovies(query, request, response){
  const urlToVisit = `https://api.themoviedb.org/3/search/movie?api_key=${MOVIE_API_KEY}&query=${query.search_query}`;
  superagent.get(urlToVisit).then(responseFromSuper => {
    const formattedMovie = responseFromSuper.body.results.map(
      movie => new Movie(movie.title, movie.overview, movie.vote_average, movie.vote_count, movie.backdrop_path, movie.popularity, movie.release_date)
    );
    response.send(formattedMovie);

    formattedMovie.forEach(movie => {
      const sqlQueryInsert = `
        INSERT INTO movies (search_query, title, overview, vote_average, vote_count, image_url, popularity, release_date)
        VALUES ($1, $2, $3, $4, $5, $6, $7);`;
      const valuesArray = [query.search_query, movie.title, movie.overview, movie.vote_average, movie.vote_count, movie.backdrop_path, movie.popularity, movie.release_date, now()];
      client.query(sqlQueryInsert, valuesArray);
    })
  }).catch(error => {
    response.status(500).send(error.message);
    console.error(error);
  })
}



function getLocation(request, response) {
  const query = request.query.data;
  client.query(`SELECT * FROM locations WHERE search_query=$1`, [query]).then(sqlResult => {
    if(sqlResult.rowCount > 0){
      response.send(sqlResult.rows[0]);
    } else {
      updateLocation(query, request, response);
    }
  });
}

function getWeather(request, response){
  const query = request.query.data;
  client.query(`SELECT * FROM weather WHERE search_query=$1`, [query.search_query]).then(sqlResult => {
    if(sqlResult.rowCount > 0){
      if (isOlderThan(sqlResult.rows, 15)) {
        console.log('Refreshing old weather data');
        deleteRows(sqlResult.rows, 'weather');
        updateWeather(query, request, response);
      } else {
        response.send(sqlResult.rows);
      }
    } else {
      updateWeather(query, request, response);
    }
  });
}

function getEvents(request, response) {
  const query = request.query.data;
  client.query(`SELECT * FROM events WHERE search_query=$1`, [query.search_query]).then(sqlResult => {
    if(sqlResult.rowCount > 0){
      if (isOlderThan(sqlResult.rows, SEC_IN_DAY)) {
        deleteRows(sqlResult.rows, 'events');
        updateEvents(query, request, response);
      } else {
        response.send(sqlResult.rows);
      }
    } else {
      updateEvents(query, request, response);
    }
  });
}


function getMovies(request, response) {
  const query = request.query.data;
  client.query(`SELECT * FROM movies WHERE search_query=$1`, [query.search_query]).then(sqlResult=> {
      if(sqlResult.rowCount > 0){
        if (isOlderThan(sqlResult.rows, SEC_IN_DAY)) {
          deleteRows(sqlResult.rows, 'movies');
          updateMovies(query, request, response);
        } else {
          response.send(sqlResult.rows);
        }
      } else {
        updateMovies(query, request, response);
    }
  });
}

function now() {
  // seconds now
  return Math.floor((new Date()).valueOf() / MS_IN_SEC);
}

function deleteRows(rows, table) {
  const deleteQuery = `
    DELETE FROM ${table}
    WHERE id IN (${rows.map(row => row.id).join(',')});`;
  client.query(deleteQuery, []);
}

function isOlderThan(rows, seconds){
  for(let i = 0; i<rows.length; i++){
    if(parseInt(rows[i].created_at) + seconds < now()) {
      // at least one of the rows is older than
      return true;
    }
  }
  // none of the rows is older than
  return false;
}

app.get('/location', getLocation);
app.get('/weather', getWeather);
app.get('/events', getEvents);
app.get('/movies', getMovies);

app.listen(PORT, () => {console.log(`app is up on PORT ${PORT}`)});

console.log();