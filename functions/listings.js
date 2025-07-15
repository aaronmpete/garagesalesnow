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
            } catch (readError) {
                console.error('Error reading listings.json:', readError.message);
                listings = [];
            }

            let newSale;
            try {
                newSale = JSON.parse(event.body);
                console.log('Parsed sale:', newSale);
            } catch (parseError) {
                return {
                    statusCode: 400,
                    body: JSON.stringify({ error: 'Invalid JSON: ' + parseError.message })
                };
            }

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
            } catch (geocodeError) {
                console.error('Geocoding error for', newSale.location, ':', geocodeError.message);
                return {
                    statusCode: 500,
                    body: JSON.stringify({ error: `Geocoding failed: ${geocodeError.message}` })
                };
            }

            newSale.lat = lat;
            newSale.lng = lng;
            newSale.id = listings.length ? Math.max(...listings.map(l => l.id)) + 1 : 1;
            listings.push(newSale);

            try {
                await fs.writeFile(listingsPath, JSON.stringify(listings, null, 2));
                console.log('Sale saved successfully');
            } catch (writeError) {
                console.error('Write error:', writeError.message);
                return {
                    statusCode: 500,
                    body: JSON.stringify({ error: 'Failed to save sale: ' + writeError.message })
                };
            }

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