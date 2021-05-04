const path = require("path");
const orders = require(path.resolve("src/data/orders-data"));
const nextId = require("../utils/nextId");
const validStatusList = ["pending", "preparing", "out-for-delivery", "delivered"];

function list(request, response) {
    response.json({ data: orders });
};

function read(request, response) {
    response.json({ data: response.locals.order });
};

function create(request, response) {
    const { data: { deliverTo, mobileNumber, status, dishes = [] } = {} } = request.body;
    const newOrder = {
        id: nextId(),
        deliverTo, mobileNumber, status, dishes
    };
    orders.push(newOrder);
    response.status(201).json({ data: newOrder });
};

function update(request, response) {
    const order = response.locals.order;
    const { data: { deliverTo, mobileNumber, status, dishes } = {} } = request.body;
    order.deliverTo = deliverTo;
    order.mobileNumber = mobileNumber;
    order.status = status;
    order.dishes = dishes;
    response.json({ data: order });
};

function destroy(request, response) {
    const { orderId } = request.params;
    const index = orders.findIndex(order => order.id === orderId);
    if (index > -1) {
        orders.splice(index, 1);
    }
    response.sendStatus(204);
};

function orderExists(request, response, next) {
    const orderId = request.params.orderId;
    const foundOrder = orders.find(order => order.id === orderId);
    if (foundOrder === undefined) {
        return next({
            status: 404,
            message: `Order id not found: ${orderId}`
        });
    } response.locals.order = foundOrder;
    next();
};

function hasAddressAndNumber(request, response, next) {
    const { data: { deliverTo, mobileNumber } = {} } = request.body;
    let property = "";
    if (!deliverTo || deliverTo.length === 0) property = "deliverTo";
    else if (!mobileNumber || mobileNumber.length === 0) property = "mobileNumber";
    else return next();
    next({ status: 400, message: `Order must include a ${property}` });
};

function hasValidStatus(request, response, next) {
    const { data: { status } = {} } = request.body;
    if (!status || status.length === 0 || !validStatusList.includes(status)) {
        return next({ status: 400, message: "Order must have a status of pending, preparing, out-for-delivery, delivered" })
    }
    else if (status === "delivered") {
        return next({ status: 400, message: "A delivered order cannot be changed" })
    }
    else return next();
};

function hasDishes(request, response, next) {
    const { data: { dishes = [] } = {} } = request.body;
    if (!dishes) next({ status: 400, message: "Order must include a dish" });
    else if (!Array.isArray(dishes) || dishes.length === 0) next({ status: 400, message: "Order must include at least one dish" });
    else return next();
};

function dishHasQuantity(request, response, next) {
    const { data: { dishes = [] } = {} } = request.body;
    try {
        dishes.forEach((dish) => {
            if (dish.quantity === undefined || Number(dish.quantity) <= 0 || !Number.isInteger(dish.quantity)) {
                next({ status: 400, message: `Dish ${dishes.indexOf(dish)} must have a quantity that is an integer greater than 0` })
            }
        })
        next();
    } catch (error) {
        next(error);
    }
};

function isNotPending(request, response, next) {
    const order = response.locals.order;
    if (order.status !== "pending") {
        return next({
            status: 400,
            message: "An order cannot be deleted unless it is pending"
        });
    } return next();
};

function orderIdMatches(request, response, next) {
    const { orderId } = request.params;
    const originalOrderId = request.body.data.id;
    if (originalOrderId && originalOrderId !== orderId) return next({ status: 400, message: `Order id does not match route id. Dish: ${originalOrderId}, Route: ${orderId}` });
    return next();
};

module.exports = {
    list,
    read: [orderExists, read],
    create: [hasAddressAndNumber, hasDishes, dishHasQuantity, create],
    update: [orderExists, hasAddressAndNumber, hasDishes, hasValidStatus, orderIdMatches, dishHasQuantity, update],
    delete: [orderExists, isNotPending, destroy],
};