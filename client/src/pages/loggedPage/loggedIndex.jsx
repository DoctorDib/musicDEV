import React from 'react';
import ReactDom from 'react-dom';

import mainTheme from '../../styles/theme';
import Indexer from './content/index';
import MuiThemeProvider from '@material-ui/core/styles/MuiThemeProvider';

class App extends React.Component {
    render() {
        return (
            <MuiThemeProvider theme={mainTheme}>
                <Indexer />
            </MuiThemeProvider>
        );
    };
}

ReactDom.render(<App />, document.getElementById('importContent'));
