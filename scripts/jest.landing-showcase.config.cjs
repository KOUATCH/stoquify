const configure = require("next/jest")();

// Isolated component lane: no Next configuration, application env or database.
module.exports = configure({
  rootDir: "..",
  roots: ["<rootDir>/components/landing", "<rootDir>/components/dashboard/__tests__"],
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
    "^lucide-react$":
      "<rootDir>/node_modules/lucide-react/dist/cjs/lucide-react.js",
  },
  testMatch: [
    "<rootDir>/components/landing/__tests__/ProductWorkflowDemo.test.tsx",
    "<rootDir>/components/landing/__tests__/CinematicLanding.test.tsx",
    "<rootDir>/components/landing/__tests__/JourneyPreview.test.tsx",
    "<rootDir>/components/landing/__tests__/EnquiryForm.test.tsx",
    "<rootDir>/components/landing/__tests__/PublicRouteMetadata.test.tsx",
    "<rootDir>/components/dashboard/__tests__/todays-operating-truth.test.ts",
  ],
  collectCoverage: false,
});
