import React, { useState } from 'react';
import { Container, Row, Col, Form, Card } from 'react-bootstrap';

const CroppingTest = () => {
  const [coords, setCoords] = useState({
    x: 0.117,
    y: 0.450,
    width: 0.083,
    height: 0.067
  });

  const imageUrl = "https://storage.googleapis.com/csp-bucket/images/medium/IMG_1331_medium.jpg";

  // Method 1: Using clip-path
  const getClipPathStyle = () => {
    const x1 = coords.x * 100;
    const y1 = coords.y * 100;
    const x2 = (coords.x + coords.width) * 100;
    const y2 = (coords.y + coords.height) * 100;
    
    return {
      width: '100%',
      height: 'auto',
      clipPath: `polygon(${x1}% ${y1}%, ${x2}% ${y1}%, ${x2}% ${y2}%, ${x1}% ${y2}%)`
    };
  };

  // Method 2: Using object-fit and transform (current method)
  const getCurrentMethodStyle = () => {
    const cropX = coords.x * 100;
    const cropY = coords.y * 100;
    const cropWidth = coords.width * 100;
    const cropHeight = coords.height * 100;
    const scaleX = 100 / cropWidth;
    const scaleY = 100 / cropHeight;

    return {
      objectFit: 'none',
      objectPosition: `-${cropX * scaleX}% -${cropY * scaleY}%`,
      transform: `scale(${scaleX}, ${scaleY})`,
      transformOrigin: 'top left',
      width: '100%',
      height: '100%'
    };
  };

  // Method 3: Using background image
  const getBackgroundStyle = () => {
    const scaleX = 100 / (coords.width * 100);
    const scaleY = 100 / (coords.height * 100);
    const posX = -(coords.x * 100 * scaleX);
    const posY = -(coords.y * 100 * scaleY);

    return {
      width: '100%',
      height: '300px',
      backgroundImage: `url(${imageUrl})`,
      backgroundSize: `${scaleX * 100}% ${scaleY * 100}%`,
      backgroundPosition: `${posX}% ${posY}%`,
      backgroundRepeat: 'no-repeat'
    };
  };

  return (
    <Container className="mt-4">
      <h2>Cropping Test - Nancy McDonald Plaque</h2>
      
      <Row className="mb-4">
        <Col md={6}>
          <Card>
            <Card.Header>Cropping Coordinates</Card.Header>
            <Card.Body>
              <Form>
                <Form.Group className="mb-2">
                  <Form.Label>X: {coords.x.toFixed(3)}</Form.Label>
                  <Form.Range
                    value={coords.x}
                    onChange={(e) => setCoords({...coords, x: parseFloat(e.target.value)})}
                    min={0}
                    max={1}
                    step={0.001}
                  />
                </Form.Group>
                <Form.Group className="mb-2">
                  <Form.Label>Y: {coords.y.toFixed(3)}</Form.Label>
                  <Form.Range
                    value={coords.y}
                    onChange={(e) => setCoords({...coords, y: parseFloat(e.target.value)})}
                    min={0}
                    max={1}
                    step={0.001}
                  />
                </Form.Group>
                <Form.Group className="mb-2">
                  <Form.Label>Width: {coords.width.toFixed(3)}</Form.Label>
                  <Form.Range
                    value={coords.width}
                    onChange={(e) => setCoords({...coords, width: parseFloat(e.target.value)})}
                    min={0.01}
                    max={1}
                    step={0.001}
                  />
                </Form.Group>
                <Form.Group className="mb-2">
                  <Form.Label>Height: {coords.height.toFixed(3)}</Form.Label>
                  <Form.Range
                    value={coords.height}
                    onChange={(e) => setCoords({...coords, height: parseFloat(e.target.value)})}
                    min={0.01}
                    max={1}
                    step={0.001}
                  />
                </Form.Group>
              </Form>
            </Card.Body>
          </Card>
        </Col>
        <Col md={6}>
          <Card>
            <Card.Header>Original Image</Card.Header>
            <Card.Body>
              <img src={imageUrl} alt="Original" style={{width: '100%', height: 'auto'}} />
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row>
        <Col md={4}>
          <Card>
            <Card.Header>Method 1: Clip Path</Card.Header>
            <Card.Body>
              <img src={imageUrl} alt="Clip Path" style={getClipPathStyle()} />
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card>
            <Card.Header>Method 2: Current (Transform)</Card.Header>
            <Card.Body>
              <div style={{width: '100%', height: '300px', overflow: 'hidden'}}>
                <img src={imageUrl} alt="Transform" style={getCurrentMethodStyle()} />
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card>
            <Card.Header>Method 3: Background</Card.Header>
            <Card.Body>
              <div style={getBackgroundStyle()}></div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row className="mt-4">
        <Col>
          <Card>
            <Card.Header>Debug Info</Card.Header>
            <Card.Body>
              <pre>{JSON.stringify({
                coordinates: coords,
                pixelCoords: {
                  x: Math.round(coords.x * 2048),
                  y: Math.round(coords.y * 1536),
                  width: Math.round(coords.width * 2048),
                  height: Math.round(coords.height * 1536)
                },
                currentMethodStyle: getCurrentMethodStyle()
              }, null, 2)}</pre>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default CroppingTest;