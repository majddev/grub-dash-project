const path = require("path");
const dishes = require(path.resolve("src/data/dishes-data"));
const nextId = require("../utils/nextId");

function list(request, response) {
    response.json({ data: dishes });
};

function create(request, response) {
    const { data: { name, description, price, image_url } = {} } = request.body;
    const newDish = {
        id: nextId(),
        name, description, price, image_url
    }
    dishes.push(newDish);
    response.status(201).json({ data: newDish });
};

function read(request, response) {
    response.json({ data: response.locals.dish });
};

function hasAllProperties(request, response, next) {
    const { data: { name, description, price, image_url } = {} } = request.body;
    let property = "";
    if (!name) property = "name";
    else if (!description) property = "description";
    else if (!image_url || image_url.length == 0) property = "image_url";
    else if (!price) property = "price";
    else if (price && price <= 0 || !Number.isInteger(price)) next({ status: 400, message: "Dish must have a price that is an integer greater than 0" });
    else return next();
    next({ status: 400, message: `Dish must include a ${property}` });
};

function dishExists(request, response, next) {
    const dishId = request.params.dishId;
    const foundDish = dishes.find((dish) => dish.id === dishId);
    if (foundDish === undefined) {
        return next({
            status: 404,
            message: `Dish id not found: ${dishId}`
        });
    }
    response.locals.dish = foundDish;
    return next();
};

function update(request, response) {
    const dish = response.locals.dish;
    const { data: { name, description, price, image_url } = {} } = request.body;
    dish.name = name;
    dish.description = description;
    dish.price = price;
    dish.image_url = image_url;
    response.json({ data: dish });
};

function dishIdMatches(request, response, next) {
    const { dishId } = request.params;
    const OriginalDishId = request.body.data.id;
    if (OriginalDishId && OriginalDishId !== dishId) return next({ status: 400, message: `Dish id does not match route id. Dish: ${OriginalDishId}, Route: ${dishId}` });
    return next();
};

module.exports = {
    create: [hasAllProperties, create],
    list,
    read: [dishExists, read],
    update: [dishExists, dishIdMatches, hasAllProperties, update],
};