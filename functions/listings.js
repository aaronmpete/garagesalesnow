const fs = require('fs').promises;
const path = require('path');

exports.handler = async function (event) {
    try {
        const listingsPath = path.join(__dirname, '../data/listings.json');
        const data = await fs.readFile(listingsPath, 'utf8');
        let listings = JSON.parse(data);

        const { location, radius, itemType } = event.queryStringParameters || {};

        // Basic filtering (simplified for prototype)
        if (location) {
            listings = listings.filter(listing => listing.location.toLowerCase().includes(location.toLowerCase()));
        }
        if (itemType) {
            listings = listings.filter(listing => listing.itemType === itemType);
        }
        // Radius filtering requires geocoding; placeholder logic
        if (radius) {
            // In production, use a geocoding API to filter by distance
            listings = listings.filter(listing => listing.lat && listing.lng); // Placeholder
        }

        return {
            statusCode: 200,
            body: JSON.stringify(listings)
        };
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Failed to fetch listings' })
        };
    }
};