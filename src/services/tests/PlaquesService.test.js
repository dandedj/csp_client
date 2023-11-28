import { PlaquesService } from '../PlaquesService';
import config from '../../config';

const plaquesService = new PlaquesService();

test('getPlaques should call the Google Cloud function and return the plaques', async () => {
  // Mock the fetch function and its response
  const mockResponse = {
    ok: true,
    json: jest.fn().mockResolvedValue(['plaque1', 'plaque2']),
  };
  global.fetch = jest.fn().mockResolvedValue(mockResponse);

  // Call the getPlaques method
  const result = await plaquesService.getPlaques();

  // Assert that the fetch function was called with the correct URL
  expect(fetch).toHaveBeenCalledWith(config.api.searchPlaquesUrl);

  // Assert that the response was converted to JSON
  expect(mockResponse.json).toHaveBeenCalled();

  // Assert that the result is the expected plaques
  expect(result).toEqual(['plaque1', 'plaque2']);
});

test('getPlaques should handle network errors', async () => {
  // Mock the fetch function and its response
  const mockResponse = {
    ok: false,
  };
  global.fetch = jest.fn().mockResolvedValue(mockResponse);

  // Call the getPlaques method
  const result = await plaquesService.getPlaques();

  // Assert that the fetch function was called with the correct URL
  expect(fetch).toHaveBeenCalledWith(config.api.searchPlaquesUrl);

  // Assert that an error was thrown
  expect(result).toBeInstanceOf(Error);
});test('getPlaqueById should call the Google Cloud function with the correct URL and return the plaque', async () => {
  // Mock the fetch function and its response
  const mockResponse = {
    ok: true,
    json: jest.fn().mockResolvedValue('plaque'),
  };
  global.fetch = jest.fn().mockResolvedValue(mockResponse);

  // Call the getPlaqueById method
  const result = await plaquesService.getPlaqueById('123');

  // Assert that the fetch function was called with the correct URL
  expect(fetch).toHaveBeenCalledWith(`${config.api.plaqueDetailUrl}?id=123`);

  // Assert that the response was converted to JSON
  expect(mockResponse.json).toHaveBeenCalled();

  // Assert that the result is the expected plaque
  expect(result).toEqual('plaque');
});

test('getPlaqueById should handle network errors', async () => {
  // Mock the fetch function and its response
  const mockResponse = {
    ok: false,
  };
  global.fetch = jest.fn().mockResolvedValue(mockResponse);

  // Call the getPlaqueById method
  const result = await plaquesService.getPlaqueById('123');

  // Assert that the fetch function was called with the correct URL
  expect(fetch).toHaveBeenCalledWith(`${config.api.plaqueDetailUrl}?id=123`);

  // Assert that an error was thrown
  expect(result).toBeInstanceOf(Error);
});

test('getPlaques should call the Google Cloud function and return the plaques', async () => {
  // Mock the fetch function and its response
  const mockResponse = {
    ok: true,
    json: jest.fn().mockResolvedValue(['plaque1', 'plaque2']),
  };
  global.fetch = jest.fn().mockResolvedValue(mockResponse);

  // Call the getPlaques method
  const result = await plaquesService.getPlaques();

  // Assert that the fetch function was called with the correct URL
  expect(fetch).toHaveBeenCalledWith(config.api.searchPlaquesUrl);

  // Assert that the response was converted to JSON
  expect(mockResponse.json).toHaveBeenCalled();

  // Assert that the result is the expected plaques
  expect(result).toEqual(['plaque1', 'plaque2']);
});

test('getPlaques should handle network errors', async () => {
  // Mock the fetch function and its response
  const mockResponse = {
    ok: false,
  };
  global.fetch = jest.fn().mockResolvedValue(mockResponse);

  // Call the getPlaques method
  const result = await plaquesService.getPlaques();

  // Assert that the fetch function was called with the correct URL
  expect(fetch).toHaveBeenCalledWith(config.api.searchPlaquesUrl);

  // Assert that an error was thrown
  expect(result).toBeInstanceOf(Error);
});

test('getPlaques should call the Google Cloud function with query parameter and return the plaques', async () => {
  // Mock the fetch function and its response
  const mockResponse = {
    ok: true,
    json: jest.fn().mockResolvedValue(['plaque1', 'plaque2']),
  };
  global.fetch = jest.fn().mockResolvedValue(mockResponse);

  // Call the getPlaques method with a query parameter
  const result = await PlaquesService.getPlaques('search query');

  // Assert that the fetch function was called with the correct URL including the query parameter
  expect(fetch).toHaveBeenCalledWith(`${config.api.searchPlaquesUrl}?text=search query`);

  // Assert that the response was converted to JSON
  expect(mockResponse.json).toHaveBeenCalled();

  // Assert that the result is the expected plaques
  expect(result).toEqual(['plaque1', 'plaque2']);
});

test('getPlaques should log an error message when there is a problem with the fetch operation', async () => {
  // Mock the fetch function to throw an error
  global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

  // Call the getPlaques method
  const result = await PlaquesService.getPlaques();

  // Assert that the fetch function was called with the correct URL
  expect(fetch).toHaveBeenCalledWith(config.api.searchPlaquesUrl);

  // Assert that an error message was logged
  expect(console.error).toHaveBeenCalledWith('There has been a problem with your fetch operation:', new Error('Network error'));

  // Assert that the result is undefined
  expect(result).toBeUndefined();
});