import webpack4Loader from '@linaria/webpack4-loader';
import webpack5Loader from '@linaria/webpack5-loader';
function webpackLoader(...args) {
  if ('getOptions' in this) {
    // webpack v5
    webpack5Loader.apply(this, args);
  } else {
    // webpack v4
    webpack4Loader.apply(this, args);
  }
}
export default webpackLoader;
//# sourceMappingURL=index.js.map