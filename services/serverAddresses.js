export const baseUrl = "https://server.moaddi-app.com/";
export const socketAddress = baseUrl;
export const address = baseUrl + "api/v1/";

export const signInAddress = address + "users/signin";
export const signUpAddress = address + "users/signup";
export const otpAddress = address + "users/otp";
export const getVendorsAPI = address + "users/role/Vendor";
export const getCustomerAPI = address + "users/role/Customer";
export const addUserAPI = address + "users/create";
export const machinesAPI = address + "machines";
export const shopsAPI = address + "shops";
export const groupsAPI = address + "groups";
export const unassignedMachinesAPI = machinesAPI + "/all";
export const productAPI = address + "products";
export const purchasesAPI = address + "purchases";
export const contentUploadAPI = baseUrl + "content/upload";
export const allPendingRequests = address + "purchases/allpendingrequests";
export const getCertificatesAPI = address + "broker/generatecerts";

export const userAPI = (id) => address + "users/" + id;
export const shopAPI = (id) => address + "shops/" + id;
export const groupAPI = (id) => address + "groups/" + id;
export const contentAPI = (id) => baseUrl + "content/" + id;
export const userToggleAPI = (id) => address + "users/" + id + "/toggle";
export const machineAPI = (id) => address + "machines/" + id;
export const purchaseAPI = (id) => address + "purchases/" + id;
export const MachinesByVendor = (id) => address + "machines/vendor/" + id;
export const ShopsByVendor = (id) => address + "shops/vendor/" + id;
export const purchaseByCustomer = (id) =>
  address + "purchases/customerHistory/" + id;
export const purchaseByInvoice = (id) => address + "purchases/invoice/" + id;
export const MachinesByProduct = (id) => address + "machine/product/" + id;
export const MachinesByShop = (id) => address + "machine/shop/" + id;
export const MachinesByShopVendor = (shopId, vendorId) =>
  `${address}machine/shop/${shopId}/vendor/${vendorId}`;
export const MachinesByGroup = (id) => address + "machine/group/" + id;
export const VendorsByShop = (id) => address + "vendor/shop/" + id;
export const ProductsByMachine = (id) => address + "product/machine/" + id;
export const ProductsByVendor = (id) => address + "product/vendor/" + id;
export const machineToggleAPI = (id) => address + "machines/" + id + "/toggle";
export const machineQRScan = (id) => address + "machines/qrcode/" + id;
export const assignMachineAPI = (id) =>
  address + "machines/vendor/" + id + "/assign";
export const unassignMachineAPI = (id) =>
  address + "machines/" + id + "/unassign";
export const boxUpdateAPI = (id) =>
  address + "boxes/product/" + id + "/changeproduct";
export const unassignBoxAPI = (id) =>
  address + "boxes/machine/" + id + "/unassign";
export const productsAPI = (id) => address + "products/" + id;
