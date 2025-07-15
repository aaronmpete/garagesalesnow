const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');

exports.handler = async function (event) {
    const listingsPath = path.join(__dirname, '../data/listings.json');

    try {
        console.log('Method:', event.httpMethod);
        console.log('Body:', event.body);

        if (event.httpMethod === 'GET') {
            const data = await fs.readFile(listingsPath, 'utf8');
            let listings = JSON.parse(data);

            const { location, radius, itemType } = event.queryStringParameters || {};

            if (location) {
                listings = listings.filter(listing => 
                    listing.location.toLowerCase().includes(location.toLowerCase()));
            }
            if (itemType) {
                listings = listings.filter(listing => listing.itemType === itemType);
            }
            if (radius) {
                listings = listings.filter(listing => listing.lat && listing.lng && listing.lat !== 0 && listing.lng !== 0);
            }

            return {
                statusCode: 200,
                body: JSON.stringify(listings)
            };
        } else if (event.httpMethod === 'POST') {
            if (!event.body) {
                return {
                    statusCode: 400,
                    body: JSON.stringify({ error: 'No sale data provided' })
                };
            }

            let listings = [];
            try {
                const data = await fs.readFile(listingsPath, 'utf8');
                listings = JSON.parse(data);
            } catch (error) {
                console.error('Error reading listings.json:', error.message);
                listings = [];
            }

            const newSale = JSON.parse(event.body);
            if (!newSale.title || !newSale.location || !newSale.date) {
                return {
                    statusCode: 400,
                    body: JSON.stringify({ error: 'Missing required fields' })
                };
            }

            let lat = 0, lng = 0;
            try {
                const query = newSale.location.match(/^\d{5}$/) 
                    ? `${newSale.location}, United States` 
                    : `${newSale.location}, USA`;
                const response = await axios.get('https://nominatim.openstreetmap.org/search', {
                    params: {
                        q: query,
                        format: 'json',
                        limit: 1,
                        countrycodes: 'us'
                    },
                    headers: { 'User-Agent': 'GarageSalesNow/1.0 (aaron.m.pete@gmail.com)' }
                });
                if (response.data.length > 0) {
                    lat = parseFloat(response.data[0].lat);
                    lng = parseFloat(response.data[0].lon);
                    console.log(`Geocoded ${newSale.location} to lat: ${lat}, lng: ${lng}`);
                } else {
                    console.log(`No geocoding results for ${newSale.location}`);
                    return {
                        statusCode: 400,
                        body: JSON.stringify({ error: `Invalid location: ${newSale.location}` })
                    };
                }
            } catch (error) {
                console.error('Geocoding error for', newSale.location, ':', error.message);
                return {
                    statusCode: 400,
                    body: JSON.stringify({ error: `Geocoding failed for ${newSale.location}` })
                };
            }

            newSale.lat = lat;
            newSale.lng = lng;
            newSale.id = listings.length ? Math.max(...listings.map(l => l.id)) + 1 : 1;
            listings.push(newSale);
            await fs.writeFile(listingsPath, JSON.stringify(listings, null, 2));

            return {
                statusCode: 200,
                body: JSON.stringify({ message: 'Sale posted successfully' })
            };
        } else {
            return {
                statusCode: 405,
                body: JSON.stringify({ error: 'Method not allowed' })
            };
        }
    } catch (error) {
        console.error('Error in handler:', error.message);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Failed to process request: ' + error.message })
        };
    }
};