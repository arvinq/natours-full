class APIFeatures {
  constructor(queryObj, queryString) {
    this.queryObj = queryObj;
    this.queryString = queryString;
  }

  filter() {
    // BUILD QUERY
    // We need to exclude the query string that are not included in docs and have different purpose
    // 1) Initial Filtering
    //we're creating a new JS object via destructuring, then curly braces for a new object
    //we do this bec. if we edit req.query directly, or a var (reference) containing req.query,
    //we will be affecting the req.query and we don't want that.
    const queryObj = { ...this.queryString };
    const excludedFields = ['page', 'sort', 'limit', 'fields'];
    excludedFields.forEach((element) => {
      //we're using delete from express and deleting the element that in our excluded list
      delete queryObj[element];
    });

    // 2) Advance Filtering
    let queryString = JSON.stringify(queryObj); //convert queryObj to string, let for mutable
    //once converted to string, we replace gt|gte|lt|lte with same string prepending a $.
    //since queryString is mutable, assign it to itself
    queryString = queryString.replace(
      /\b(gt|gte|lt|lte)\b/g, //regular expression, \b for matching exact word only, g for all occurences
      (match) => `$${match}` //once match is found, prepend a $ before it.
    );
    // then parse it to js obj
    const newQueryObj = JSON.parse(queryString);

    //... two ways to filter the query string passed in the url.
    // (eg. ?duration=5&difficulty=easy)
    // 1.) chaining special mongoose methods to filter query string
    // find() returns a Query, then chained to return another query and so on..
    // then assign Query object to tours
    // const query = Tour.find()
    //   .where('duration')
    //   .filter(5)
    //   .where('dificulty')
    //   .equals('easy');
    // 2.) using the find({js obj}). Now req.query already returns an object of all the query strings
    // As soon as we hit await, we won't be able to chain impt functions like sort, limit, since it will
    // execute right away. So, we need to remove await to chain impt functions in the future
    // const tours = await Tour.find(queryObj);
    this.queryObj = this.queryObj.find(newQueryObj);

    //return the whole object so that we can chain other methods of this object
    return this;
  }

  sort() {
    // 3) Sorting. Let's change query to let to mutate it
    //if there's a sort query string present, then do sorting
    if (this.queryString.sort) {
      //mongoose's sort runs multiple sortFields separated by space,
      //so in actual url, sorting fields are separated by , and we replace it with space
      const sortFields = this.queryString.sort.split(',').join(' ');
      this.queryObj = this.queryObj.sort(sortFields);
    } else {
      //if no sortField present, we sort by createdAt (newest to oldest)
      this.queryObj = this.queryObj.sort('-createdAt');
    }

    return this;
  }

  limitFields() {
    // 4) Field limiting / projecting
    //if there's a fields query string present, then do projecting
    if (this.queryString.fields) {
      //same as sorting, mongoose's projecting accepts multiple selected fields separated
      //by space. then we add -__v on the string so that we don't include it in our query
      let selectFields = this.queryString.fields.split(',').join(' ');
      // selectFields = `${selectFields} -__v`; ---> this needs some thinking
      // console.log(selectFields);
      this.queryObj = this.queryObj.select(selectFields);
    } else {
      //if there's no selected field, then we just omit __v in our fields
      this.queryObj = this.queryObj.select('-__v');
    }

    return this;
  }

  paginate() {
    // 5) Pagination
    const page = this.queryString.page * 1 || 1; //default to 1
    const limit = this.queryString.limit * 1 || 100; //default to 100
    const skip = (page - 1) * limit; //previous page * docs per page

    this.queryObj = this.queryObj.skip(skip).limit(limit);

    // not needed in here anymore, no results is enough for user to know that there's no data
    // if (req.query.page) {
    //   const numTours = await Tour.countDocuments(); //return the number of docs in Tour collection
    //   if (skip >= numTours) {
    //     //if the doc in page exceeded the total number of docs, then we throw
    //     throw new Error('Page does not exist');
    //   }
    // }
    return this;
  }
}

module.exports = APIFeatures;
