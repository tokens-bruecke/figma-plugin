// The home page is our own layout (components/home), in place of the
// theme's hero and features
import { Layout as BaseLayout } from '@rspress/core/theme-original';
import Home from '../components/home/Home';

const Layout = () => <BaseLayout HomeLayout={Home} />;

export { Layout };
export * from '@rspress/core/theme-original';
