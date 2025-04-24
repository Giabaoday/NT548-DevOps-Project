exports.handler = async (event) => {
    console.log('Received event:', JSON.stringify(event, null, 2));
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: 'Hello from Lambda neww!',
        timestamp: new Date().toISOString()
      })
    };
  };