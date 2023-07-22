import React, { useState, useEffect } from "react";
import "./App.css";
import "@aws-amplify/ui-react/styles.css";
import { Storage } from "aws-amplify";
import { API, GRAPHQL_AUTH_MODE } from '@aws-amplify/api';
import {
  Button,
  Flex,
  Heading,
  Image,
  Text,
  TextField,
  View,
  withAuthenticator,
} from "@aws-amplify/ui-react";
import { listPhotos } from "./graphql/queries";
import {
  createPhoto as createPhotoMutation,
  deletePhoto as deletePhotoMutation,
} from "./graphql/mutations";
import { nanoid } from "nanoid";

const App = ({ signOut }) => {
  const [photos, setPhotos] = useState([]);

  useEffect(() => {
    fetchPhotos();
  }, []);

  async function fetchPhotos() {
    const apiData = await API.graphql({ query: listPhotos });
    const photosFromAPI = apiData.data.listPhotos.items;
    await Promise.all(
      photosFromAPI.map(async (photo) => {
        const url = await Storage.get(photo.name);
        photo.imageUrl = url;
        return photo;
      })
    )
    setPhotos(photosFromAPI);
  }

  async function createPhotos(event) {
    event.preventDefault();
    const form = new FormData(event.target);
    const images = form.getAll("images");
    if (!images || images.length === 0) {
      console.error("No file(s) selected");
      return;
    };

    await Promise.all(images.map(createPhoto));

    fetchPhotos();
    event.target.reset();
  }

  async function createPhoto(image) {
    const uid = nanoid(10);
    const filename = `${uid}-${image.name}`;

    const data = {
      name: filename
      // TODO extract photo metadata
    };
    
    await Storage.put(filename, image, {
      contentType: image.type,
    });

    await API.graphql({
      query: createPhotoMutation,
      variables: { input: data },
      authMode: GRAPHQL_AUTH_MODE.AMAZON_COGNITO_USER_POOLS
    });
  }

  async function deletePhoto({ id, name }) {
    const newPhotos = photos.filter((photo) => photo.id !== id);
    setPhotos(newPhotos);
    await Storage.remove(name);
    await API.graphql({
      query: deletePhotoMutation,
      variables: { input: { id } },
      authMode: GRAPHQL_AUTH_MODE.AMAZON_COGNITO_USER_POOLS
    });
  }

  return (
    <View className="App">
      <Heading level={1}>Photography</Heading>
      <View as="form" margin="3rem 0" onSubmit={createPhotos}>
        <Flex direction="row" justifyContent="center">
          <View
            name="images"
            as="input"
            type="file"
            style={{ alignSelf: "end" }}
            multiple
            required
          />
          <Button type="submit" variation="primary">
            Upload Photo
          </Button>
        </Flex>
      </View>
      <Heading level={2}>Photos</Heading>
      <View margin="3rem 0">
        {photos.map((photo) => (
          <Flex
            key={photo.id || photo.name}
            direction="row"
            justifyContent="center"
            alignItems="center"
          >
            <Text as="strong" fontWeight={700}>
              {photo.name}
            </Text>
            <Text as="span">{photo.description}</Text>
            {photo.imageUrl && (
              <Image
                src={photo.imageUrl}
                alt={`visual aid for ${photos.name}`}
                style={{ width: 400 }}
              />
            )}
            <Button variation="link" onClick={() => deletePhoto(photo)}>
              Delete photo
            </Button>
          </Flex>
        ))}
      </View>
      <Button onClick={signOut}>Sign Out</Button>
    </View>
  );
};

export default withAuthenticator(App);