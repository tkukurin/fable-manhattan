module.exports = [
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
    },
    rules: {
      "no-unused-vars": "warn",
      "no-undef": "warn",
      "eqeqeq": "warn",
      "no-const-assign": "error",
      "no-redeclare": "error",
      "semi": ["warn", "always"],
      "quotes": ["warn", "double"],
      "curly": "warn"
    }
  }
];
