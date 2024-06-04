const http = require('http');

// Create a server instance
const server = http.createServer((req, res) => {
    // Log the request method and URL
    console.log(`${req.method} ${req.url}`);

    // Log the request content
    let requestData = '';
    req.on('data', chunk => {
        requestData += chunk;
    });

    req.on('end', () => {
        console.dir(requestData)

        // Set response headers
        res.writeHead(200, {'Content-Type': 'text/plain'});

        // Send a response
        res.end(requestData);
    });
});

// Define the port to listen on
const PORT = process.env.PORT || 8080;

// Start the server
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});