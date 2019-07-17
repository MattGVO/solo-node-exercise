const express = require("express"),
  axios = require("axios"),
  _ = require("lodash"),
  app = express(),
  port = 4002;

app.get("/people", async (req, res) => {
  let url = "https://swapi.co/api/people";
  let allPeopleFound = false;
  let pages = ["https://swapi.co/api/people/?page=1"];

  while (!allPeopleFound) {
    try {
      let result = await axios.get(url);
      const { next } = result.data;
      if (next) {
        pages.push(result.data.next);
        url = result.data.next;
      } else {
        allPeopleFound = true;
      }
    } catch (err) {
      res.status(500).send(err);
    }
  }

  Promise.all(pages.map(page=> axios.get(page)))
    .then(peopleResults => {
      let allPeople = _.flatten(peopleResults.map(returnVal => returnVal.data.results));

      const sortBy = req.query.sortBy.toLowerCase()

      if (sortBy === "height" || sortBy === "mass") {
        allPeople.forEach(person => {
          person[sortBy] = person[sortBy].split(",").join("") //to account for commas in weight
          if (person[sortBy] === "unknown") { //to sort all of the unknowns to the bottom
            person[sortBy] = 0;
          }
        });
        //Descending Sort
        allPeople.sort((a, b) => {
          let aSort = +a[sortBy];
          let bSort = +b[sortBy];
          return bSort - aSort;
        });
        allPeople.forEach(val => {
          if (val[sortBy] === 0) {
            val[sortBy] = "unknown";
          }
        });
      }
      if (sortBy === "name") {
        allPeople.sort((a, b) => {
          let aName = a.name.toLowerCase();
          let bName = b.name.toLowerCase();
          if (aName < bName) {
            return -1;
          } else if (aName > bName) {
            return 1;
          }
        });
      }
      res.status(200).send(allPeople);
    })
    .catch(err => {
      res.status(500).send(err);
    });
});

app.get("/planets", async (req, res) => {
  let url = "https://swapi.co/api/planets";
  let allPlanetsFound = false;
  let pages = ["https://swapi.co/api/planets/?page=1"];

  while (!allPlanetsFound) {
    try {
      let result = await axios.get(url);
      if (result.data.next) {
        pages.push(result.data.next);
        url = result.data.next;
      } else {
        allPlanetsFound = true;
      }
    } catch (err) {
      res.status(500).send(err);
    }
  }

  let planets = await Promise.all(pages.map(val => axios.get(val)))
  .catch(err => {
      res.status(500).send(err);
    }
  );

  let allPlanets = _.flatten(planets.map(planet => planet.data.results));

  //mapping out all residents in to their own multidimensional array to get endpoint for each of them
  let residents = allPlanets.map(planet => planet.residents);

  // reassigning each resident array to the results of all the endpoints
  for (let i = 0, l = residents.length; i < l; i++) {
    if (residents[i].length > 0) {
      residents[i] = await Promise.all(
        residents[i].map(val => axios.get(val).then(result => result.data.name))
      ).catch(err => {
        res.status(500).send(err);
      });
    }
  }
  //adding the names to the original planets array before sending it
  allPlanets.forEach((planet, i) => (planet.residents = residents[i]));
  res.status(200).send(allPlanets);
});


app.listen(port, () => console.log(`Port ${port}, listening it is.`));
