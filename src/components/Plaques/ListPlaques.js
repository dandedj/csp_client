import React, { Component } from 'react';
import { Link } from 'react-router-dom';
import { PlaquesService } from '../../services/PlaquesService';

const plaquesService = new PlaquesService();

export default class ListPlaques extends Component {

    constructor(props) {
        super(props);
        this.state = {
            plaques: []
        }
    }

    componentDidMount() {
        plaquesService.getAllPlaques().then((res) => {
            console.log("Response from the plaques service from within component: ", res);
            this.setState({ plaques: res })

        })
            .catch((error) => {
                console.error('There has been a problem with your fetch operation:', error);
            });
    }

    render() {
        return (
            <div className="container">

                <h1>Plaques</h1>
                <table className='table span12'>
                    <thead className="table-dark">
                        <tr>
                            <th></th>
                            <th>Id</th>
                            <th>Location</th>
                            <th>Photo</th>
                            <th>Text</th>
                        </tr>
                    </thead>
                    <tbody className="table-light">
                        {this.state.plaques.map((plaque, index) => {
                            return (
                                <tr key={index}>
                                    <td><Link to={`/detail/${plaque.id}`} className="btn btn-dark">View</Link></td>
                                    <td className="Plaque-Id">{plaque.id}</td>
                                    <td className="Plaque-Location">{plaque.latitude},{plaque.longitude}</td>
                                    <td><div className="img-thumbnail"><img width="80" src={plaque.image_path} alt="" /></div></td>
                                    <td><div className='Plaque-Text text-truncate' style={{ maxWidth: "150px" }}>{plaque.text}</div></td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        )
    }
}
