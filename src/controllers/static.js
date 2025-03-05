const getCities =  (req, res) => {
  const cities = ["Mumbai", "Bangalore", "Chennai", "Pune"];
  res.json(cities);
};

router.get("/city", getCities);