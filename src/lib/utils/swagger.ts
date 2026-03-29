import swaggerJsdoc from "swagger-jsdoc";

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Chatter API",
      version: "1.0.0",
      description: "REST API for the Chatter chat application",
    },
    components: {
      securitySchemes: {
        BearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
      schemas: {
        User: {
          type: "object",
          properties: {
            _id: { type: "string" },
            username: { type: "string" },
            email: { type: "string" },
            name: { type: "string" },
            avatar: { type: "string" },
            isVerified: { type: "boolean" },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        Chat: {
          type: "object",
          properties: {
            _id: { type: "string" },
            name: { type: "string" },
            isGroup: { type: "boolean" },
            members: {
              type: "array",
              items: { $ref: "#/components/schemas/User" },
            },
            lastMessage: { $ref: "#/components/schemas/Message" },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        Message: {
          type: "object",
          properties: {
            _id: { type: "string" },
            chat: { type: "string" },
            sender: { $ref: "#/components/schemas/User" },
            content: { type: "string" },
            type: {
              type: "string",
              enum: ["text", "image", "video", "file"],
            },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        Contact: {
          type: "object",
          properties: {
            _id: { type: "string" },
            owner: { type: "string" },
            contact: { $ref: "#/components/schemas/User" },
            nickname: { type: "string" },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        Error: {
          type: "object",
          properties: {
            message: { type: "string" },
          },
        },
      },
    },
  },
  apis: ["./src/routes/*.ts"],
};

export const swaggerSpec = swaggerJsdoc(options);
