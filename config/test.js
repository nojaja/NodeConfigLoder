module.exports = {
    "key1" : "value",
    "key2" : new Secret("Secret value"),
    "key3" : Buffer.from('7f454c46','hex'),
    "key4" : /\s@Test\s.*/i,
    "key5" : {
        "key5-1" : "value",
        "key5-2" : new Secret("Secret value"),
        "key5-3" : Buffer.from('7f454c46','hex'),
    },
    "key6" : [
         "value",
         new Secret("Secret value"),
         Buffer.from('7f454c46','hex'),
    ]
}