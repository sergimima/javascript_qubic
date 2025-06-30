
=======================================================================================================================
Deployment completed successfully.
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
RPC is available at: http://185.84.224.100:8000/v1/tick-info
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
To connect to the testnet via qubic-cli, use:
_______________________
|                     |
| IP: 185.84.224.100  |
| Port: 31841         |
|_____________________|
Example commands:
./qubic-cli -nodeip 185.84.224.100 -nodeport 31841 -getcurrenttick
Response:
Tick: 23480018
Epoch: 159
Number Of Aligned Votes: 0
Number Of Misaligned Votes: 0
Initial tick: 23480000
./qubic-cli -nodeip 185.84.224.100 -nodeport 31841 -getbalance WEVWZOHASCHODGRVRFKZCGUDGHEDWCAZIZXWBUHZEAMNVHKZPOIZKUEHNQSJ
Response:
Identity: WEVWZOHASCHODGRVRFKZCGUDGHEDWCAZIZXWBUHZEAMNVHKZPOIZKUEHNQSJ
Balance: 1000000000
Incoming Amount: 1000000000
Outgoing Amount: 0
Number Of Incoming Transfers: 1
Number Of Outgoing Transfers: 0
Latest Incoming Transfer Tick: 15502487
Latest Outgoing Transfer Tick: 0
Tick: 23480018
Spectum Digest: 1a6122fcea6d52dc9f8b003e0d6d78030db4718bf1ef89da7b0ccec74a68a01b
=======================================================================================================================

./qubic-cli -nodeip 185.84.224.100 -nodeport 31841 -checktxontick 23481523 sgtqlelmqxrvegfrplbrkaqtvevbasatvrtegcwntabpjwxwqjgmsbjdybfa

./qubic-cli -nodeip 185.84.224.100 -nodeport 31841 -vottungetorderbydetails 0x090378a9c80c5E1Ced85e56B2128c1e514E75657 1537 1

