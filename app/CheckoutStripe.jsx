import { useStripe } from "@stripe/stripe-react-native";
import { useRouter } from "expo-router";
import { Trash2 } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Button } from "~/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { useMachine } from "~/context/MachineContext";
import { useSocket } from "~/context/Socket";
import { useUser } from "~/context/UserContext";
import alert from "~/lib/alert";
import { Fit } from "~/services/dataProvider";
import {
  deleteRequest,
  getRequest,
  postRequest,
  putRequest,
} from "~/services/httpClient";
import { purchaseAPI, purchasesAPI, userAPI } from "~/services/serverAddresses";

export const routes = {
  // direct
  0: "/BoxGrid",
  // MQTT (moaddi-najaf)
  1: "/BoxGrid",
  // Bluetooth(1) (zbmpos - Wifi 4g)
  2: "/BoxGrid",
  // Bluetooth(2) kaisijin 12 - Bluetooth
  3: "/Bluetooth2Control",
  // Bluetooth(4) Yunxian Bluetooth
  4: "/Bluetooth4Control",
  // Bluetooth(3) kaisijin 24 - Bluetooth
  5: "/Bluetooth3Control",
  // Bluetooth(5) genai
  6: "/Bluetooth5Control",
};

const CheckoutItems = ({ totalPrice, setTotalPrice }) => {
  const { user, setUser } = useUser();
  const { machines, machine } = useMachine();
  const [products, setProducts] = useState([]);
  const router = useRouter();
  const { t } = useTranslation();

  useEffect(() => {
    if (!user) return;
    if (!user?.purchase) return router.dismissAll();
    // console.log(user);
    const boxes = user?.purchase?.boxes ?? [];
    const products = Object.values(
      boxes
        .map((box) => box.product)
        .filter(Boolean)
        .map(Fit.image)
        .reduce((prev, curr) => {
          prev[curr._id] = prev[curr._id]
            ? { ...prev[curr._id], amount: prev[curr._id].amount + 1 }
            : { ...curr, amount: 1 };
          return prev;
        }, {})
    );
    if (!products.length)
      remove(user.purchase._id).then((response) =>
        setUser(({ purchase, ...rest }) => rest)
      );
    setProducts(products);
  }, [user]);

  useEffect(() => {
    setTotalPrice(
      products.reduce(
        (prev, { salePrice, campaignPrice, amount }) =>
          prev + (campaignPrice ?? salePrice) * amount,
        0
      )
    );
  }, [products]);

  const cancel = (id) =>
    putRequest(purchaseAPI(user.purchase._id), {
      items: user.purchase.boxes
        .filter(({ productId }) => productId != id)
        .map(({ _id, productId, boxStatus }) => ({
          boxId: _id,
          productId,
          boxStatus,
        })),
    }).then((response) => {
      setProducts((prev) => prev.filter(({ _id }) => _id != id));
      getRequest(userAPI(user._id)).then((response) =>
        setUser((prev) => ({ ...prev, ...response }))
      );
    });

  const remove = (id) => deleteRequest(purchaseAPI(id));

  const lastRow = (
    <TableRow>
      <TableCell />
      <TableCell />
      <TableCell />
      <TableCell />
      <TableCell className="h-12 flex items-center justify-center">
        <Text className="absolute">
          {t("totalPrice")} {totalPrice} {t("sar")}
        </Text>
      </TableCell>
      <TableCell />
    </TableRow>
  );
  return (
    (machine || machines) && (
      <ScrollView
        horizontal
        // bounces={false}
        showsHorizontalScrollIndicator={false}
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <Text> {t("image")}</Text>
              </TableHead>
              <TableHead>
                <Text> {t("name")}</Text>
              </TableHead>
              <TableHead>
                <Text> {t("price")}</Text>
              </TableHead>
              <TableHead>
                <Text> {t("amount")}</Text>
              </TableHead>
              <TableHead>
                <Text> {t("total")}</Text>
              </TableHead>
              <TableHead>
                <Text> {t("cancel")}</Text>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map(
              ({ _id, name, image, salePrice, campaignPrice, amount }) => {
                return (
                  <TableRow key={_id}>
                    <TableCell>
                      {image && (
                        <Image
                          source={{ uri: image.src }}
                          alt={name}
                          width="70"
                          height="60"
                          resizeMode="contain"
                          className="h-10 rounded-xl border-foreground"
                        />
                      )}
                    </TableCell>
                    <TableCell className="flex items-center justify-center">
                      <Text> {name}</Text>
                    </TableCell>
                    <TableCell className="flex items-center justify-center">
                      <Text>
                        {" "}
                        {campaignPrice ?? salePrice} {t("sar")}
                      </Text>
                    </TableCell>
                    <TableCell className="flex items-center justify-center">
                      <Text>{amount}</Text>
                      {/* <CheckoutButtonGroup {...checkoutButtonGroup} /> */}
                    </TableCell>
                    <TableCell className="flex items-center justify-center">
                      <Text>
                        {(campaignPrice ?? salePrice) * amount}
                        {` ${t("sar")}`}
                      </Text>
                    </TableCell>
                    <TableCell className="flex items-center justify-center">
                      <Button
                        size="icon"
                        variant="ghost"
                        onPress={(e) => cancel(_id)}
                      >
                        <Trash2 color="red" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              }
            )}
            {lastRow}
          </TableBody>
        </Table>
      </ScrollView>
    )
  );
};

const CheckoutStripe = () => {
  const { initPaymentSheet, presentPaymentSheet } = useStripe();

  const [totalPrice, setTotalPrice] = useState(0);
  const [loading, setLoading] = useState(false);

  const { log } = useSocket();
  const { user, setUser } = useUser();
  const { machines, setMachine, setMachines } = useMachine();
  const router = useRouter();
  // log(JSON.stringify(machines));
  // 1. Fetch Client Secret from your Express server
  const fetchPaymentSheetParams = async () => {
    const { clientSecret } = await postRequest(
      purchaseAPI("create-payment-intent"),
      {
        amount: totalPrice * 100,
        currency: "sar",
        purchaseId: user.purchase._id,
      }
    );

    return { clientSecret };
  };
  // 2. Initialize the Payment Sheet UI
  const initializePaymentSheet = async () => {
    setLoading(true);
    const { clientSecret } = await fetchPaymentSheetParams();
    // console.log(clientSecret);

    const { error } = await initPaymentSheet({
      merchantDisplayName: "Fortis",
      paymentIntentClientSecret: clientSecret,
      // allowsDelayedPaymentMethods: true, // Optional: for SEPA/Sofort
    });

    if (!error) {
      setLoading(false);
      openPaymentSheet(); // Automatically open or wait for user click
    } else {
      alert("error", "Initialization error", error.message);
    }
  };

  // 3. Display the Payment Sheet
  const openPaymentSheet = async () => {
    const { error } = await presentPaymentSheet();
    if (error) {
      alert("error", `${error.code}`, error.message);
    } else {
      alert("success", "Your payment is confirmed!");
      // Make it PaymentDone
      const isComplete = await postRequest(
        `${purchasesAPI}/stripeIsPaymentDone`,
        {
          _id: user.purchase._id,
        }
      );
      // console.log("isComplete", isComplete);
      if (isComplete.error) return alert("error", isComplete);
      // pass
      const { status, boxes, machine } = isComplete;
      // console.log("isCompete", isComplete);

      const nextMachine = machine ? machine : machines.at(0);
      setMachines((prev) => [...prev.slice(1)]);
      setMachine(nextMachine);
      // log(nextMachine);
      setUser(({ purchase, ...rest }) => ({
        ...rest,
        purchase: {
          ...purchase,
          status,
          boxes,
          machine: nextMachine,
          controlRoute: routes[nextMachine.type],
        },
      }));
      router.dismissAll();
      console.log(routes[nextMachine.type]);
      console.log(machine);
      console.log(nextMachine);
      
      router.push(routes[nextMachine.type]);
    }
  };

  const checkoutItems = { totalPrice, setTotalPrice };

  return (
    <>
      <View style={styles.container}>
        {loading && (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color="black" />
          </View>
        )}

        <CheckoutItems {...checkoutItems} />
      </View>

      <View style={styles.container}>
        <Button
          variant="outline"
          disabled={loading}
          onPress={initializePaymentSheet}
        >
          <Text>Checkout Now</Text>
        </Button>
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    paddingTop: 10,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },

  loading: {
    zIndex: 1,
    opacity: 1,
    backgroundColor: "#00000093",
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
});

export default CheckoutStripe;
