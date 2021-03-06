import React from 'react';
import PropTypes from 'prop-types';
import timeAgo from 'timeago-simple';
import Axios from "axios";

import styles from './style';
import iconManager from 'config/iconManager';

import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import Paper from '@material-ui/core/Paper';
import Typography from '@material-ui/core/Typography';
import Button from '@material-ui/core/Button';
import Tooltip from '@material-ui/core/Tooltip';

import PlayButtonIcon from 'mdi-react/PlayCircleFilledIcon';
import TrashIcon from 'mdi-react/TrashIcon';

import { withStyles } from '@material-ui/core/styles';

const headerMap = {
    desktop: {
        recommend: ['Activity', 'Song name', 'Genre', 'Play'],
        history: ['Activity', 'Song name', 'Genre', 'Play', 'Time'],
        manager: ['Activity', 'Song name', 'Genre', 'Play', 'Tools'],
    },
    mobile: {
        recommend: ['Song name', 'Play'],
        history: ['Song name', 'Play'],
        manager: ['Song name', 'Play', 'Tools'],
    }
};

class Template extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            tableContent: [],
            tableType: 'recommend',

            active: "#04040491",
            notActive: "#ffffff00", // Transparent

            currentSong: '',
            desktopMode: true,
        };
    }

    manageNewProps = (props) => {
        let newProps = {};

        for (let prop in props) {
            if(props.hasOwnProperty(prop)) {
                if (props[prop] !== this.props[prop]) {
                    newProps[prop] = props[prop];
                }
            }
        }

        return newProps;
    };

    componentDidMount(props) {
        this.setState({
            tableContent: this.props.tableContent,
            tableType: this.props.tableType,
            currentSong: this.props.currentSong,
            desktopMode: this.props.desktopMode,
        });
    };

    componentWillReceiveProps(newProps){
        let props = this.manageNewProps(newProps);

        if (Object.keys(props).length) {
            this.setState(props);
        }
    }

    deleteTrack = uri => () => {
        console.log(`Delete ${uri}`)

        Axios.get('managePlaylist', {
            params: {
                task: 'deleteSingle',
                uri: uri
            }
        }).then((resp) => {
            console.log(resp)
            if (resp.data.success) {
                this.setState({tableContent: resp.data.savedTracks})
            }
        }).catch(function(err) {
            console.error("Manage playlist: ", err)
        });
    };

    formatTime = milliseconds => {
        return timeAgo.simple(new Date(milliseconds));
    };

    formatIcons = (iconList, style) => {
        return iconList.map(icon =>
            <Tooltip className={style.icon} disableFocusListener disableTouchListener title={icon.name} placement="bottom">
                {icon.icon}
            </Tooltip>
        );
    };

    render(){
        const { classes } = this.props;

        let headers = headerMap[this.state.desktopMode ? 'desktop' : 'mobile'][this.state.tableType].map(header =>
            <TableCell style={{textAlign: header==='Play' || header==="Tools" ? 'center' : 'none'}}> {header} </TableCell>
        );

        let isActive = (name) => {
            return this.state.currentSong === name ? this.state.active : this.state.notActive;
        };

        let newTable = this.state.tableContent.map(recommended =>
            <TableRow style={{background: isActive(recommended.name)}}>
                <TableCell>
                    {this.formatIcons(iconManager(recommended.genre), classes)}
                </TableCell>
                <TableCell> {recommended.name} </TableCell>
                <TableCell> {recommended.genre} </TableCell>
                <TableCell style={{width: '2%'}}>
                    <Button href={"https://open.spotify.com/track/" + recommended.id}> <PlayButtonIcon /> </Button>
                </TableCell>
                {this.state.tableType === 'history' ?
                    <TableCell asign="center">
                        <Typography variant="caption"> {this.formatTime(recommended.time)} </Typography>
                    </TableCell>
                    : null}

                {this.state.tableType === 'manager' ?
                    <TableCell asign="center">
                        <Typography variant="caption">
                            <Tooltip disableFocusListener disableTouchListener title="Remove track">
                                <Button onClick={this.deleteTrack(recommended.id)}><TrashIcon/></Button>
                            </Tooltip>
                        </Typography>
                    </TableCell>
                    : null}
            </TableRow>
        );

        return (
            <Paper className={classes.main} square>
                <Table className={classes.table}>
                    <TableHead>
                        <TableRow> {headers} </TableRow>
                    </TableHead>
                    <TableBody> {newTable} </TableBody>
                </Table>
            </Paper>
        );
    }
}

Template.propTypes = {
    classes: PropTypes.object.isRequired
};

export default withStyles(styles)(Template);
