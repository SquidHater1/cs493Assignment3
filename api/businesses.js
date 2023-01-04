const { Router } = require('express')
const { ValidationError } = require('sequelize')
const { requireAuthentication } = require('../lib/auth')

const { Business, BusinessClientFields } = require('../models/business')
const { Photo } = require('../models/photo')
const { Review } = require('../models/review')
const { User } = require('../models/user')

const router = Router()

/*
 * Route to return a list of businesses.
 */
router.get('/', async function (req, res) {
  /*
   * Compute page number based on optional query string parameter `page`.
   * Make sure page is within allowed bounds.
   */
  let page = parseInt(req.query.page) || 1
  page = page < 1 ? 1 : page
  const numPerPage = 10
  const offset = (page - 1) * numPerPage

  const result = await Business.findAndCountAll({
    limit: numPerPage,
    offset: offset
  })

  /*
   * Generate HATEOAS links for surrounding pages.
   */
  const lastPage = Math.ceil(result.count / numPerPage)
  const links = {}
  if (page < lastPage) {
    links.nextPage = `/businesses?page=${page + 1}`
    links.lastPage = `/businesses?page=${lastPage}`
  }
  if (page > 1) {
    links.prevPage = `/businesses?page=${page - 1}`
    links.firstPage = '/businesses?page=1'
  }

  /*
   * Construct and send response.
   */
  res.status(200).json({
    businesses: result.rows,
    pageNumber: page,
    totalPages: lastPage,
    pageSize: numPerPage,
    totalCount: result.count,
    links: links
  })
})

//helper function for checking if user has access
async function userHasAccess(reqUser, targetId){
  console.log("== Got reqUser: ", reqUser)
  console.log("== Got targetId: ", targetId)
  const tempUser = await getUserById(reqUser, false)
  console.log("== Got user to check for admin: ", tempUser)
  const isAdmin = tempUser.admin
  console.log("== Got admin flag value: ", isAdmin)
  return !(reqUser != targetId && isAdmin != true)
}

//get user helper function
async function getUserById(userId, includePassword){
  if(includePassword){
    const thisUser = await User.findByPk(userId)
    return thisUser
  }else{
    const thisUser = await User.findByPk(userId, {
      attributes: {exclude: ['password']}
    })
    return thisUser
  }
}

async function getUserByEmail(email){
  const thisUser = await User.findOne({
    where: {email: email}
  })
  return thisUser
}

/*
 * Route to create a new business.
 */
router.post('/', requireAuthentication, async function (req, res, next) {
  try {
    const hasAccess = await userHasAccess(req.user, req.body.ownerId)
    if(!hasAccess){
      res.status(403).json({
        error: "Unauthorized to create resource for specified user"
      })
    }else{
      const business = await Business.create(req.body, BusinessClientFields)
      res.status(201).send({ id: business.id })
    }
  } catch (e) {
    if (e instanceof ValidationError) {
      res.status(400).send({ error: e.message })
    } else {
      throw e
    }
  }
})

/*
 * Route to fetch info about a specific business.
 */
router.get('/:businessId', async function (req, res, next) {
  const businessId = req.params.businessId
  const business = await Business.findByPk(businessId, {
    include: [ Photo, Review ]
  })
  if (business) {
    res.status(200).send(business)
  } else {
    next()
  }
})

/*
 * Route to update data for a business.
 */
router.patch('/:businessId', requireAuthentication, async function (req, res, next) {
  
  const businessId = req.params.businessId
  const thisBusiness = await Business.findOne({
    where: {id: businessId}
  })
  const hasAccess = await userHasAccess(req.user, thisBusiness.ownerId)

  if(!hasAccess){
    res.status(403).json({
      error: "Unauthorized to update resource for specified user"
    })
  }else{
    const result = await Business.update(req.body, {
      where: { id: businessId },
      fields: BusinessClientFields
    })
    if (result[0] > 0) {
      res.status(204).send()
    } else {
      next()
    }
  }
})

/*
 * Route to delete a business.
 */
router.delete('/:businessId', requireAuthentication, async function (req, res, next) {
  const businessId = req.params.businessId

  const thisBusiness = await Business.findOne({
    where: {id: businessId}
  })
  const hasAccess = await userHasAccess(req.user, thisBusiness.ownerId)

  if(!hasAccess){
    res.status(403).json({
      error: "Unauthorized to delete resource for specified user"
    })
  }else{
    const result = await Business.destroy({ where: { id: businessId }})
    if (result > 0) {
      res.status(204).send()
    } else {
      next()
    }
  }
})

module.exports = router
