import { router, Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Bluetooth, Minus, Plus, Wifi, WifiOff } from "lucide-react-native";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Image, ScrollView, StyleSheet, View } from "react-native";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { Text } from "~/components/ui/text";
import { useMachine } from "~/context/MachineContext";
import { useSocket } from "~/context/Socket";
import { useUser } from "~/context/UserContext";
import useBLE from "~/hook/useBLE";
import useBlu2 from "~/hook/useBlu2";
import useBlu3 from "~/hook/useBlu3";
import useBlu4 from "~/hook/useBlu4";
import alert from "~/lib/alert";
import { getRequest, postRequest } from "~/services/httpClient";
import {
  baseUrl,
  machineQRScan,
  purchasesAPI,
  userAPI,
} from "~/services/serverAddresses";

function DefaultView({
  machine,
  setTotal,
  onPurchaseHandler,
  totalPrice,
  payButton,
}) {
  const { t } = useTranslation();
  return (
    <ScrollView>
      <View className="m-3 gap-4">
        {machine.products?.map((product, i) => (
          <MachineProductCard {...product} setTotal={setTotal} key={i} />
        ))}
      </View>
      <View className="m-4 flex flex-row justify-center items-center gap-4">
        <Button
          size={"default"}
          variant="outline"
          onPress={onPurchaseHandler}
          {...payButton}
        >
          <Text>{t("checkoutAndPay")}</Text>
        </Button>
        <Text>
          {totalPrice} {t("sar")}
        </Text>
      </View>
    </ScrollView>
  );
}

function MachineProductCard({
  _id,
  productName,
  boxes,
  image,
  salePrice,
  campaignPrice,
  setTotal,
}) {
  const [quantity, setQuantity] = useState(0);
  const { t } = useTranslation();
  const available = boxes.filter(({ isActive }) => isActive).length;
  useEffect(() => {
    setTotal((total) => ({ ...total, [_id]: quantity }));
  }, [quantity]);
  // console.log(b aseUrl + image);

  return (
    available > 0 && (
      <Card className="rounded-xl border">
        <View className="grid gap-1 px-4">
          <View className="relative flex justify-center">
            <Image
              style={styles.productImage}
              source={{ uri: baseUrl + image }}
              alt={productName}
              resizeMode="contain"
              // width="190"
              // height="200"
              className="h-50 w-full rounded-xl border border-muted mt-4"
            />
          </View>
          <Text className="font-semibold text-center">{productName}</Text>
          <View className="flex flex-row justify-between">
            <Text>
              {campaignPrice ?? salePrice} {t("sar")}
            </Text>
            <Text>
              {"available"} {available - quantity}
            </Text>
          </View>
          <View className="my-2 flex flex-row items-center justify-center gap-1">
            <Button
              variant="outline"
              className={
                quantity >= 0 && quantity < available
                  ? ""
                  : "pointer-events-none"
              }
              onPress={(e) =>
                setQuantity((prev) =>
                  prev >= 0 && prev < available ? ++prev : prev
                )
              }
            >
              <Plus
                className={
                  quantity >= 0 && quantity < available ? "" : "opacity-40"
                }
              />
            </Button>
            <Button variant={"secondary"} disabled>
              <Text>{quantity}</Text>
            </Button>
            <Button
              variant="outline"
              className={quantity > 0 ? "" : "pointer-events-none"}
              onPress={(e) => setQuantity((prev) => (prev > 0 ? --prev : prev))}
            >
              <Minus className={quantity > 0 ? "" : "opacity-40"} />
            </Button>
          </View>
        </View>
      </Card>
    )
  );
}

function StackScreen({ name, icon }) {
  return (
    <Stack.Screen
      options={{
        headerTitle: () => {
          return (
            <View className="flex-row items-center gap-2">
              <Text className="text-xl mt-2">{name}</Text>
              {icon}
            </View>
          );
        },
      }}
    />
  );
}

export default function MachineProducts() {
  const { machineId } = useLocalSearchParams();
  const { machine, setMachine, setBluFeedback, setMachines } = useMachine();
  const [total, setTotal] = useState({});
  const { user, setUser } = useUser();
  const router = useRouter();
  const { t } = useTranslation();
  const totalPrice = Object.entries(total).reduce((prev, [id, number]) => {
    if (!machine?.products?.length) return prev;
    const product = machine.products.find(({ _id }) => _id == id);
    if (!product) return prev;
    const price = (product.campaignPrice ?? product.salePrice) * number;
    return prev + price;
  }, 0);

  useEffect(() => {
    setBluFeedback(null);
    setMachines([]);
    // if (!user) return router.navigate("/Signin");
    // clearMachine();
    (async () => {
      const response = await getRequest(machineQRScan(machineId));
      if (response.statusCode) return alert("error", t("machineNotFound"));
      if (process.env.NODE_ENV == "production") {
        if (!response.isConnected) return alert("error", t("machineIsOffline"));
        if (!response.isActive) return alert("error", t("machineIsNotActive"));
      }
      // alert("success", `machineDetected`);
      setMachine(response);
    })();
  }, []);

  const onPurchaseHandler = async(e) => {
    if (!user) return router.navigate("/Signin");
    if (!totalPrice) return;
    console.log(totalPrice);
    const items = [];
    Object.entries(total).forEach(([id, number]) => {
      const product = machine.products.find(({ _id }) => _id == id);
      if (!product) return;
      for (let i = 0; i < number; i++)
        items.push({
          productId: id,
          boxId: product.boxes[i]._id,
          boxStatus: false,
        });
    });
    console.log(user);
    console.log({
      customerId: user._id,
      machine,
      machineId: machine._id,
      price: totalPrice,
      items,
    });

    try {
      const purchaseResponse = await postRequest(purchasesAPI, {
        customerId: user._id,
        machine,
        machineId: machine._id,
        price: totalPrice,
        items,
      });
      const purchase = purchaseResponse?.purchase ?? purchaseResponse;
      if (!purchase?._id) {
        const response = await getRequest(userAPI(user._id));
        setUser((prev) => ({ ...prev, ...(response?.data ?? response) }));
        return router.navigate("/CheckoutStripe");
      }
      // API doesn't return purchase.boxes – build it from items + machine so CheckoutStripe can extract products
      const machineData = purchase.machine ?? machine;
      const boxes = items
        .map(({ productId, boxId }) => {
          const product = machineData?.products?.find((p) => p._id === productId);
          const box = product?.boxes?.find((b) => b._id === boxId);
          return box && product ? { ...box, product } : null;
        })
        .filter(Boolean);
      setUser((prev) => ({ ...prev, purchase: { ...purchase, boxes } }));
      router.navigate("/CheckoutStripe");
    } catch (err) {
      console.warn("Purchase error:", err);
      alert("error", err?.message ?? "Purchase failed");
    }
  };

  const machineTools = {
    machine,
    setTotal,
    onPurchaseHandler,
    totalPrice,
  };

  return (
    <>
      {machine?.qrCode == machineId ? (
        <>
          {machine?.type == 0 && <MachineDirect {...machineTools} />}
          {machine?.type == 1 && <MachineDirect {...machineTools} />}
          {machine?.type == 2 && <MachineDirect {...machineTools} />}
          {/* {machine?.type == 1 && <MachineMQTT {...machineTools} />} */}
          {/* {machine?.type == 2 && <MachineBluetooth1 {...machineTools} />} */}
          {machine?.type == 3 && <MachineBluetooth2 {...machineTools} />}
          {machine?.type == 4 && <MachineBluetooth4 {...machineTools} />}
          {machine?.type == 5 && <MachineBluetooth3 {...machineTools} />}
        </>
      ) : (
        <Text className="text-xl mx-auto my-6">{t("loading")}</Text>
      )}
    </>
  );
}

function MachineDirect({ machine, setTotal, onPurchaseHandler, totalPrice }) {
  const defaultView = { machine, setTotal, onPurchaseHandler, totalPrice };
  const stackScreen = {
    name: machine.name,
    icon: machine.isConnected ? (
      <Wifi color="green" />
    ) : (
      <WifiOff color="red" />
    ),
  };
  return (
    <>
      {machine && (
        <>
          <StackScreen {...stackScreen} />
          <DefaultView {...defaultView} />
        </>
      )}
    </>
  );
}

function MachineMQTT({ machine, setTotal, onPurchaseHandler, totalPrice }) {}

function MachineBluetooth1({
  machine,
  setTotal,
  onPurchaseHandler,
  totalPrice,
}) {}

function MachineBluetooth2({
  machine,
  setTotal,
  onPurchaseHandler,
  totalPrice,
}) {
  const {
    // allDevices,
    requestPermissions,
    // scanForPeripherals,
    connectToDevice,
    bleState,
    listenForMessages,
    disconnectFromDevice,
    writeMessages,
  } = useBLE();
  const { connectedDevice } = useMachine();
  const {
    connectRetryCount,
    listenRetryCount,
    sendRetryCount,
    permissionsGranted,
  } = useBlu2(0, { back: true });

  const stackScreen = {
    name: machine.name,
    icon:
      connectedDevice?.name == machine.name ||
      connectedDevice?.localName == machine.name ||
      connectedDevice?.id == machine.mac ? (
        <Bluetooth color="green" />
      ) : (
        <Bluetooth color="red" />
      ),
  };
  const defaultView = {
    machine,
    setTotal,
    onPurchaseHandler,
    totalPrice,
    payButton: {
      disabled: false,
    },
  };

  return (
    <>
      {machine && (
        <>
          <StackScreen {...stackScreen} />
          <DefaultView {...defaultView} />
        </>
      )}
    </>
  );
}

function MachineBluetooth3({
  machine,
  setTotal,
  onPurchaseHandler,
  totalPrice,
}) {
  const { pipeline } = useBlu3({ back: true });
  const { connectRetryCount } = pipeline;
  const stackScreen = {
    name: machine.name,
    icon: !connectRetryCount ? (
      <Bluetooth color="green" />
    ) : (
      <Bluetooth color="red" />
    ),
  };
  const defaultView = {
    machine,
    setTotal,
    onPurchaseHandler,
    totalPrice,
    payButton: {
      disabled: !!connectRetryCount,
    },
  };

  return (
    <>
      {machine && (
        <>
          <StackScreen {...stackScreen} />
          <DefaultView {...defaultView} />
        </>
      )}
    </>
  );
}

function MachineBluetooth4({
  machine,
  setTotal,
  onPurchaseHandler,
  totalPrice,
}) {
  const { connectRetryCount } = useBlu4({ back: true });
  const stackScreen = {
    name: machine.name,
    icon: !connectRetryCount ? (
      <Bluetooth color="green" />
    ) : (
      <Bluetooth color="red" />
    ),
  };
  console.log(machine);
  
  const defaultView = {
    machine,
    setTotal,
    onPurchaseHandler,
    totalPrice,
    // payButton: {
    //   disabled: false,
    // },
  };
  return (
    <>
      {machine && (
        <>
          <StackScreen {...stackScreen} />
          <DefaultView {...defaultView} />
        </>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  productImage: {
    width: "100%",
    height: 200,
    borderRadius: 8,
    marginBottom: 10,
  },
});
