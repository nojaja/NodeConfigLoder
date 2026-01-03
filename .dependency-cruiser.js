/**
 * dependency-cruiser configuration file
 * Minimal configuration for dependency validation
 * @see https://github.com/sverweij/dependency-cruiser
 */

module.exports = {
  options: {
    doNotFollow: ['node_modules'],
    exclude: ['node_modules', 'dist', 'coverage'],
  },
};
