require('dotenv').config();
const { register } = require('./controllers/authController');

const req = {
  body: {
    username: 'testuser123',
    email: 'test1234@example.com',
    password: 'password123'
  }
};
const res = {
  status: (code) => {
    console.log('Status set to:', code);
    return {
      json: (data) => console.log('Response Data:', data)
    };
  }
};

(async () => {
    try {
        await register(req, res);
    } catch (e) {
        console.error('Outer Catch:', e);
    } finally {
        process.exit(0);
    }
})();
