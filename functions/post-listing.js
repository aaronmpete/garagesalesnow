const fs = require('fs').promises;
const path = require('path');

exports.handler = async function (event) {
    try {
        if (event.httpMethod !== 'POST') {
            return { statusCode: 405, body: 'Method Not Allowed' };
        }

        const listingsPath = path.join(__dirname, '../data/listings.json');
        const newListing = JSON.parse(event.body);
        const data = await fs.readFile(listingsPath, 'utf8');
        const listings = JSON.parse(data);

        newListing.id = listings.length + 1;
        listings.push(newListing);
        await fs.writeFile(listingsPath, JSON.stringify(listings, null, 2));

        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Listing posted successfully' })
        };
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Failed to post listing' })
        };
    }
};