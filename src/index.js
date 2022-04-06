const express = require("express");
const { v4: uuidv4 } = require("uuid");

const app = express();

app.use(express.json());

const customers = [];

function veriFyExistsAccount(request, response, next) {
  const { cpf } = request.headers;

  const customer = customers.find((customer) => customer.cpf == cpf);

  if (!customer) {
    return response.status(400).json({ error: "Customer not found" });
  }

  request.customer = customer;

  return next();
}

function getBalance(statements) {
  const balance = statements.reduce((acc, operation) => {
    if (operation.type === "credit") {
      return acc + operation.amount;
    } else {
      return acc - operation.amount;
    }
  }, 0);

  return balance;
}

app.post("/account", (request, response) => {
  const { cpf, name } = request.body;

  const customerAlreadyExists = customers.some(
    (customer) => customer.cpf === cpf
  );

  if (customerAlreadyExists) {
    return response.status(400).json({
      error: "Customer already exists",
    });
  }

  const customer = {
    id: uuidv4(),
    cpf,
    name,
    statements: [],
  };

  customers.push(customer);

  return response.status(201).send();
});

app.put("/account", veriFyExistsAccount, (request, response) => {
  const { customer } = request;
  const { name } = request.body;

  customer.name = name;

  return response.status(201).send();
});

app.delete("/account", veriFyExistsAccount, (request, response) => {
  const { customer } = request;

  customers.splice(customer, 1);

  return response.status(204).json(customers);
});

app.get("/account", veriFyExistsAccount, (request, response) => {
  const { customer } = request;

  return response.json(customer);
});

app.get("/statement", veriFyExistsAccount, (request, response) => {
  const { customer } = request;

  return response.json(customer.statements);
});

app.get("/statement/date", veriFyExistsAccount, (request, response) => {
  const { customer } = request;

  const { date } = request.query;

  const statements = customer.statements.filter(
    (statement) =>
      statement.created_at.toDateString() == new Date(date).toDateString()
  );

  return response.json(statements);
});

app.post("/deposit", veriFyExistsAccount, (request, response) => {
  const { customer } = request;

  const { description, amount } = request.body;

  const statementsOperation = {
    description,
    amount,
    created_at: new Date(),
    type: "credit",
  };

  customer.statements.push(statementsOperation);

  return response.status(201).send();
});

app.post("/withdraw", veriFyExistsAccount, (request, response) => {
  const { customer } = request;
  const { amount } = request.body;

  const balance = getBalance(customer.statements);

  if (amount > balance) {
    return response.status(400).json({ error: "Insufficient funds" });
  }

  const statementsOperation = {
    amount,
    created_at: new Date(),
    type: "debit",
  };

  customer.statements.push(statementsOperation);

  return response.status(201).send();
});

app.get("/balance", veriFyExistsAccount, (request, response) => {
  const { customer } = request;

  const balance = getBalance(customer.statements);

  return response.json(balance);
});

const port = process.env.PORT || 3000;
const host = process.env.HOST || "127.0.0.1";
const url = process.env.APP_URL || `http://${host}:${port}`;

app.listen(port, host);
console.log(url);
