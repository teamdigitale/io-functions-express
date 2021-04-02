module.exports = {
    "env": {
        "browser": true,
        "es6": true,
        "node": true
    },
    "ignorePatterns": [
        "node_modules",
        "generated",
        "**/__tests__/*",
        "**/__mocks__/*",
        "Dangerfile.*",
        "*.d.ts"
    ],
    "parser": "@typescript-eslint/parser",
    "parserOptions": {
        "project": "tsconfig.json",
        "sourceType": "module"
    },
    "extends": [
        "@pagopa/eslint-config/strong",
    ],
    "rules": {
        "import/order": "off",
        "@typescript-eslint/array-type": "off",
        "@typescript-eslint/explicit-member-accessibility": "off",
        "functional/prefer-readonly-type": "off",
        "@typescript-eslint/explicit-function-return-type": "off",
        "no-invalid-this": "off",
        "prefer-arrow/prefer-arrow-functions": "off",
        "@typescript-eslint/prefer-optional-chain": "off",
        "no-underscore-dangle": "off"
    }
}