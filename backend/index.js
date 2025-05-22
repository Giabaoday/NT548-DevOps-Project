//Test
const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');

const dynamoDB = new AWS.DynamoDB.DocumentClient();
const s3 = new AWS.S3();
const cognito = new AWS.CognitoIdentityServiceProvider();

// Constants
const TABLE_NAME = process.env.DYNAMODB_TABLE;
const BUCKET_NAME = process.env.S3_BUCKET_NAME || 'product-tracer-frontend-assets-dev'; // Sử dụng bucket hiện có
const REGION = process.env.AWS_REGION || 'ap-southeast-1';
const USER_POOL_ID = process.env.COGNITO_USER_POOL_ID;

const originalHandler = async (event) => {
  console.log('API Gateway Event:', JSON.stringify(event, null, 2));

  try {
    // Extract request details
    const { requestContext, pathParameters, queryStringParameters, body } = event;
    
    // API Gateway v1 vs v2 format handling
    const httpMethod = event.httpMethod || (event.requestContext?.http?.method);
    const routeKey = event.routeKey || `${httpMethod} ${event.resource}`;
    const path = event.path || event.resource || routeKey?.split(' ')[1];
    
    // Extract user ID from Cognito JWT token
    let userId = 'anonymous';
    if (requestContext?.authorizer?.jwt?.claims?.sub) {
      userId = requestContext.authorizer.jwt.claims.sub;
    } else if (requestContext?.authorizer?.claims?.sub) {
      userId = requestContext.authorizer.claims.sub;
    }
    
    const parsedBody = body ? (typeof body === 'string' ? JSON.parse(body) : body) : {};

    // Route request to appropriate handler
    let response;
    
    if (path === '/users/me' && httpMethod === 'GET') {
      response = await getUserProfile(userId);
    } 
    else if (path === '/dishes' && httpMethod === 'GET') {
      response = await listDishes(userId, queryStringParameters);
    }
    else if (path === '/dishes' && httpMethod === 'POST') {
      response = await createDish(userId, parsedBody);
    }
    else if (path === '/dishes/random' && httpMethod === 'GET') {
      response = await getRandomDish(userId, queryStringParameters);
    }
    else if (path?.startsWith('/dishes/') && httpMethod === 'GET') {
      const dishId = pathParameters?.id;
      response = await getDish(userId, dishId);
    }
    else if (path?.startsWith('/dishes/') && httpMethod === 'DELETE') {
      const dishId = pathParameters?.id;
      response = await deleteDish(userId, dishId);
    }
    else {
      return formatResponse(404, { message: 'Route not found' });
    }

    return formatResponse(200, response);
  } catch (error) {
    console.error('Error:', error);
    
    // Handle specific errors
    if (error.code === 'ConditionalCheckFailedException') {
      return formatResponse(400, { message: 'Item does not exist or you do not have permission' });
    }
    
    return formatResponse(500, { message: 'Internal server error', error: error.message });
  }
};

exports.handler = async (event, context) => {
  // Kiểm tra nếu event là từ Cognito Trigger
  if (event.triggerSource && event.version) {
    console.log('Cognito Trigger Event:', JSON.stringify(event, null, 2));
    return handleCognitoTrigger(event, context);
  }
  
  return originalHandler(event);
};

async function handleCognitoTrigger(event, context) {
  try {
    if (event.triggerSource === 'PostConfirmation_ConfirmSignUp') {
      const { userPoolId, userName, request } = event;
      const { userAttributes } = request;
      
      console.log('Đang xử lý Post Confirmation cho người dùng:', userName);
      console.log('User attributes:', JSON.stringify(userAttributes, null, 2));
      
      const timestamp = new Date().toISOString();
      
      const email = userAttributes.email;
      const username = userAttributes.preferred_username || email.split('@')[0];
      
      await dynamoDB.put({
        TableName: TABLE_NAME,
        Item: {
          PK: `USER#${userAttributes.sub}`,
          SK: 'PROFILE',
          GSI1PK: 'TYPE#USER',
          GSI1SK: username,
          userId: userAttributes.sub,
          username: username,
          email: email,
          name: userAttributes.name || username,
          createdAt: timestamp
        }
      }).promise();
      
      console.log('Đã lưu thông tin người dùng vào DynamoDB thành công');
    }
    
    return event;
  } catch (error) {
    console.error('Lỗi xử lý Cognito Trigger:', error);
    return event;
  }
}

// Get user profile
async function getUserProfile(userId) {
  const params = {
    TableName: TABLE_NAME,
    Key: {
      PK: `USER#${userId}`,
      SK: 'PROFILE'
    }
  };

  const result = await dynamoDB.get(params).promise();
  
  if (!result.Item) {
    // Nếu người dùng chưa có profile, tạo một profile trống
    return {
      userId: userId,
      username: "user_" + userId.substring(0, 8),
      dishes: 0
    };
  }
  
  return {
    userId: userId,
    username: result.Item.username,
    email: result.Item.email,
    name: result.Item.name,
    createdAt: result.Item.createdAt
  };
}

async function registerUser(userData) {
  const { username, email, sub } = userData;
  
  // Check if user already exists
  const existingUser = await dynamoDB.get({
    TableName: TABLE_NAME,
    Key: {
      PK: `USER#${sub}`,
      SK: 'PROFILE'
    }
  }).promise();
  
  if (existingUser.Item) {
    return { message: 'Tài khoản đã đăng ký', userId: sub };
  }
  
  const timestamp = new Date().toISOString();
  
  const params = {
    TableName: TABLE_NAME,
    Item: {
      PK: `USER#${sub}`,
      SK: 'PROFILE',
      GSI1PK: 'TYPE#USER',
      GSI1SK: username,
      userId: sub,
      username: username,
      email: email,
      name: userData.name || username,
      createdAt: timestamp
    }
  };
  
  await dynamoDB.put(params).promise();
  
  return {
    message: 'Đăng ký tài khoản thành công',
    userId: sub,
    username: username,
    email: email
  };
}

// List dishes (user's dishes or public dishes)
async function listDishes(userId, queryParams) {
  const scope = queryParams?.scope || 'personal'; // personal, public, all
  let params;
  
  if (scope === 'personal') {
    // Get user's personal dishes
    params = {
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: {
        ':pk': `USER#${userId}`,
        ':sk': 'DISH#'
      }
    };
  } else if (scope === 'public') {
    // Get all public dishes using GSI
    params = {
      TableName: TABLE_NAME,
      IndexName: 'GSI1Index',
      KeyConditionExpression: 'GSI1PK = :pk',
      ExpressionAttributeValues: {
        ':pk': 'TYPE#DISH'
      }
    };
  } else {
    // Get all dishes (personal + public)
    const personalDishes = await listDishes(userId, { scope: 'personal' });
    const publicDishes = await listDishes(userId, { scope: 'public' });
    
    // Filter out duplicate dishes
    const allDishes = [...personalDishes.dishes];
    publicDishes.dishes.forEach(publicDish => {
      if (!allDishes.find(dish => dish.dishId === publicDish.dishId)) {
        allDishes.push(publicDish);
      }
    });
    
    return { dishes: allDishes };
  }
  
  const result = await dynamoDB.query(params).promise();
  
  // Process and format returned dishes
  const dishes = result.Items.map(item => {
    if (scope === 'personal') {
      const dishId = item.SK.split('#')[1];
      return {
        dishId,
        dishName: item.dishName,
        imageUrl: item.imageUrl,
        isPublic: item.isPublic || false,
        createdAt: item.createdAt
      };
    } else {
      // Public dishes from GSI
      const dishId = item.SK.split('#')[1];
      return {
        dishId,
        dishName: item.dishName,
        imageUrl: item.imageUrl,
        userId: item.userId,
        username: item.username,
        createdAt: item.createdAt
      };
    }
  });
  
  return { dishes };
}

// Create a new dish
async function createDish(userId, dishData) {
  const { dishName, imageUrl, isPublic = false } = dishData;
  
  if (!dishName) {
    throw new Error('Tên món ăn là bắt buộc');
  }
  
  // Get user info for public dishes
  let userInfo = null;
  if (isPublic) {
    try {
      const userResult = await dynamoDB.get({
        TableName: TABLE_NAME,
        Key: {
          PK: `USER#${userId}`,
          SK: 'PROFILE'
        }
      }).promise();
      
      userInfo = userResult.Item;
      
      // Nếu không tìm thấy thông tin user, tạo một profile mặc định
      if (!userInfo) {
        userInfo = {
          username: "user_" + userId.substring(0, 8)
        };
      }
    } catch (error) {
      console.error('Error getting user info:', error);
    }
  }
  
  const dishId = uuidv4();
  const timestamp = new Date().toISOString();
  
  // Create transaction with items to save
  const transactItems = [
    // Save dish in user's collection
    {
      Put: {
        TableName: TABLE_NAME,
        Item: {
          PK: `USER#${userId}`,
          SK: `DISH#${dishId}`,
          GSI1PK: 'TYPE#DISH',
          GSI1SK: dishName,
          dishId,
          dishName,
          imageUrl,
          isPublic,
          createdAt: timestamp
        }
      }
    }
  ];
  
  // Add to public collection if isPublic is true
  if (isPublic && userInfo) {
    transactItems.push({
      Put: {
        TableName: TABLE_NAME,
        Item: {
          PK: 'TYPE#DISH',
          SK: `PUBLIC#${dishId}`,
          GSI1PK: `USER#${userId}`,
          GSI1SK: timestamp,
          dishId,
          dishName,
          imageUrl,
          userId,
          username: userInfo.username,
          createdAt: timestamp
        }
      }
    });
  }
  
  const params = {
    TransactItems: transactItems
  };
  
  await dynamoDB.transactWrite(params).promise();
  
  return {
    message: 'Thêm món ăn thành công',
    dish: {
      dishId,
      dishName,
      imageUrl,
      isPublic,
      createdAt: timestamp
    }
  };
}

// Get a specific dish by ID
async function getDish(userId, dishId) {
  if (!dishId) {
    throw new Error('ID món ăn là bắt buộc');
  }
  
  // First try to get the dish from user's personal collection
  const personalDishParams = {
    TableName: TABLE_NAME,
    Key: {
      PK: `USER#${userId}`,
      SK: `DISH#${dishId}`
    }
  };
  
  const personalResult = await dynamoDB.get(personalDishParams).promise();
  
  if (personalResult.Item) {
    return {
      dishId,
      dishName: personalResult.Item.dishName,
      imageUrl: personalResult.Item.imageUrl,
      isPublic: personalResult.Item.isPublic || false,
      createdAt: personalResult.Item.createdAt,
      isOwner: true
    };
  }
  
  // If not found in personal collection, try public collection
  const publicDishParams = {
    TableName: TABLE_NAME,
    Key: {
      PK: 'TYPE#DISH',
      SK: `PUBLIC#${dishId}`
    }
  };
  
  const publicResult = await dynamoDB.get(publicDishParams).promise();
  
  if (publicResult.Item) {
    return {
      dishId,
      dishName: publicResult.Item.dishName,
      imageUrl: publicResult.Item.imageUrl,
      userId: publicResult.Item.userId,
      username: publicResult.Item.username,
      createdAt: publicResult.Item.createdAt,
      isOwner: publicResult.Item.userId === userId
    };
  }
  
  throw new Error('Không tìm thấy món ăn');
}

// Get a random dish
async function getRandomDish(userId, queryParams) {
  const scope = queryParams?.scope || 'all'; // personal, public, all
  
  // Get dishes list based on scope
  const dishesResult = await listDishes(userId, { scope });
  const dishes = dishesResult.dishes;
  
  if (!dishes || dishes.length === 0) {
    return { message: 'Không tìm thấy món ăn nào' };
  }
  
  // Select a random dish
  const randomIndex = Math.floor(Math.random() * dishes.length);
  const selectedDish = dishes[randomIndex];
  
  return {
    message: 'Hôm nay ăn món này nhé!',
    dish: selectedDish
  };
}

// Delete a dish
async function deleteDish(userId, dishId) {
  if (!dishId) {
    throw new Error('ID món ăn là bắt buộc');
  }
  
  // First, verify the dish exists and belongs to the user
  const existingDishParams = {
    TableName: TABLE_NAME,
    Key: {
      PK: `USER#${userId}`,
      SK: `DISH#${dishId}`
    }
  };
  
  const existingDish = await dynamoDB.get(existingDishParams).promise();
  
  if (!existingDish.Item) {
    throw new Error('Không tìm thấy món ăn hoặc bạn không có quyền xóa nó');
  }
  
  // Prepare delete transactions
  const transactItems = [
    // Delete from user's collection
    {
      Delete: {
        TableName: TABLE_NAME,
        Key: {
          PK: `USER#${userId}`,
          SK: `DISH#${dishId}`
        },
        ConditionExpression: 'attribute_exists(PK)'
      }
    }
  ];
  
  // If dish is public, also delete from public collection
  if (existingDish.Item.isPublic) {
    transactItems.push({
      Delete: {
        TableName: TABLE_NAME,
        Key: {
          PK: 'TYPE#DISH',
          SK: `PUBLIC#${dishId}`
        }
      }
    });
  }
  
  await dynamoDB.transactWrite({ TransactItems: transactItems }).promise();
  
  return {
    message: 'Xóa món ăn thành công',
    dishId
  };
}

// Helper function to format API responses
function formatResponse(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization'
    },
    body: JSON.stringify(body)
  };
}