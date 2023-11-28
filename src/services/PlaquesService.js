import config from '../config.json';

// define the PlaquesService class
export class PlaquesService {
    async getAllPlaques() {
        // call the google cloud function called app to get the list of plaques and return them
        try {
            const response = await fetch(config.api.listPlaquesUrl);
            const data = await response.json();

            if (!response.ok) {
                console.log("Plaque service response : " + response);
                throw new Error('Network response was not ok');
            }

            return data;
        } catch (error) {
            return console.error('There has been a problem with your fetch operation:', error);
        }

    }

    // add a function to get a list of plaques given a search term
    async getPlaques(query) {
        // call the google cloud function called app to get the list of plaques and return them
        try {
            let url = config.api.searchPlaquesUrl;

            if (query) {
                url = `${url}?text=${query}`;
            }

            const response = await fetch(url);
            const data = await response.json();

            if (!response.ok) {
                console.log("Plaque service response : " + response);
                throw new Error('Network response was not ok');
            }

            return data;
        } catch (error) {
            return console.error('There has been a problem with your fetch operation:', error);
        }

    }

    async getPlaqueById(id) {
        // call the google cloud function called app to get the list of plaques and return them
        try {
            let url = config.api.plaqueDetailUrl;
            if (id) {
                url = `${url}?id=${id}`;
            }

            const response = await fetch(url);
            const data = await response.json();

            if (!response.ok) {
                console.log("Plaque service response : " + response);
                throw new Error('Network response was not ok');
            }

            return data;
        } catch (error) {
            return console.error('There has been a problem with your fetch operation:', error);
        }

    }

}