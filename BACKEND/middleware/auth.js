const jwt = require("jsonwebtoken");

module.exports = function (req, res, next) {
  const header = req.headers.authorization;
  //Authorization: Bearer abc123tokenx    


  if (!header)
    return res.status(401).json({ message: "No token provided" });

  const token = header.split(" ")[1];

  try {
    const decoded = jwt.verify(token, "MY_SECRET_KEY");//return payload
    req.user = decoded; // includes id & role
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }
};
/* Stucture of a JWT
Header — how the token is signed (algorithm)
Payload — user data (e.g., id, email)
Signature — verification proof (secret key) 

jwt.sign	Creates token	payload + secret	JWT string
jwt.verify	Validates token	token + secret	decoded payload OR error
*/