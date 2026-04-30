import { getItem } from "~/lib/utils";
import { signInAddress } from "./serverAddresses";

export const postRequest = async (url, body = null) => {
  const headers = {
    "Content-Type": "application/json",
  };
  if (url !== signInAddress) {
    const user = await getItem("user");
    if (user) headers["Authorization"] = "Bearer " + user.token;
  }
  return fetch(url, {
    method: "POST",
    headers,
    ...(body && {
      body: JSON.stringify(body),
    }),
  }).then((r) => r.json());
};
export const getRequest = async (url) => {
  const headers = {};
  const user = await getItem("user");
  if (user) headers["Authorization"] = "Bearer " + user.token;

  return fetch(url, {
    method: "GET",
    headers,
  }).then((r) => r.json());
};

export const putRequest = async (url, body = {}) => {
  const headers = {
    "Content-Type": "application/json",
  };
  const user = await getItem("user");

  if (user) headers["Authorization"] = "Bearer " + user.token;

  return fetch(url, {
    method: "PUT",
    headers,
    ...(body && {
      body: JSON.stringify(body),
    }),
  }).then((r) => r.json());
};

export const deleteRequest = async (url) => {
  const headers = {};
  const user = await getItem("user");
  if (user) headers["Authorization"] = "Bearer " + user.token;
  return fetch(url, {
    method: "DELETE",
    headers,
  }).then((r) => r.json());
};
