const jwt = require('jsonwebtoken')

const secretKey = 'SuperSecret'


function generateAuthToken(userID) {
    console.log("Generating authentication token for userID: ", userID)
    const payload = { sub: userID }
    console.log("Generated payload with payload.sub: ",payload.sub)
    return jwt.sign(payload, secretKey, { expiresIn: '24h' })
}
exports.generateAuthToken = generateAuthToken


function requireAuthentication(req, res, next) {
    const authHeader = req.get('Authorization') || ''
    const authHeaderParts = authHeader.split(' ')

    const token = authHeaderParts[0] === 'Bearer' ? authHeaderParts[1] : null
    
    try {
        const payload = jwt.verify(token, secretKey)
        console.log("== Got payload: ", payload)
        console.log("== Got payload.sub: ", payload.sub)
        req.user = payload.sub
        next()
    } catch (err) {
        res.status(401).json({
            error: "Invalid authentication token provided."
        })
    }
}
exports.requireAuthentication = requireAuthentication

