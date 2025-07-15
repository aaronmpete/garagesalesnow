const fs = require('fs').promises;
const path = require('path');

exports.handler = async function (event) {
    const listingsPath = path.join(__dirname, '../data/listings.json');

    try {
        if (event.httpMethod === 'GET') {
            const data = await fs.readFile(listingsPath, 'utf8');
            let listings = JSON.parse(data);

            const { location, radius, itemType } = event.queryStringParameters || {};

            if (location) {
                listings = listings.filter(listing => listing.location.toLowerCase().includes(location.toLowerCase()));
            }
            if (itemType) {
                listings = listings.filter(listing => listing.itemType === itemType);
            }
            if (radius) {
                listings = listings.filter(listing => listing.lat && listing.lng);
            }

            return {
                statusCode: 200,
                body: JSON.stringify(listings)
            };
        } else if (event.httpMethod === 'POST') {
            const newSale = JSON.parse(event.body);
            const data = await fs.readFile(listingsPath, 'utf8');
            const listings = JSON.parse(data);
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
        console.error('Error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Failed to process request' })
        };
    }
};