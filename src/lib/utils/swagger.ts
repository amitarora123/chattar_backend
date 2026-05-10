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
        GroupMetaData: {
          type: "object",
          properties: {
            name: { type: "string" },
            description: { type: "string", nullable: true },
            avatar_url: { type: "string", nullable: true },
            created_by: { type: "string" },
          },
        },
        GroupRole: {
          type: "object",
          nullable: true,
          properties: {
            name: { type: "string", enum: ["Admin", "Member"] },
            assigned_by: { type: "string" },
          },
        },
        ChatParticipant: {
          type: "object",
          properties: {
            user: {
              type: "object",
              properties: {
                _id: { type: "string" },
                username: { type: "string" },
                avatar_url: { type: "string", nullable: true },
              },
            },
            groupRole: { $ref: "#/components/schemas/GroupRole" },
            isContact: { type: "boolean" },
            contactName: { type: "string", nullable: true },
          },
        },
        Chat: {
          type: "object",
          properties: {
            _id: { type: "string" },
            is_group: { type: "boolean" },
            groupMetaData: {
              allOf: [{ $ref: "#/components/schemas/GroupMetaData" }],
              nullable: true,
            },
            last_message: {
              allOf: [{ $ref: "#/components/schemas/Message" }],
              nullable: true,
            },
            participants: {
              type: "array",
              items: { $ref: "#/components/schemas/ChatParticipant" },
            },
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
  apis:
    process.env.NODE_ENV === "production"
      ? ["./dist/routes/*.js"]
      : ["./src/routes/*.ts"],
};

export const swaggerSpec = swaggerJsdoc(options);
