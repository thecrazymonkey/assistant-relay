/**
 *  Assistant Relay Device Handler
 *
 *  Copyright 2018 Greg Hesp
 *
 *  Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except
 *  in compliance with the License. You may obtain a copy of the License at:
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software distributed under the License is distributed
 *  on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License
 *  for the specific language governing permissions and limitations under the License.
 *
 */

 /*
    UPDATES:

    19th Jan:
      - Added Nest Camera supported
      - Fixed bug with customBroadcast user support

 */
metadata {
    definition (name: "Assistant Relay", namespace: "greghesp", author: "Greg Hesp") {
		capability "Actuator"
        command "customBroadcast", [ "string" ]
        command "broadcast", [ "string" ]
        command "nestStartStream", ["string", "string", "string"]
        command "nestStopStream", ["string"]
        command "customCommand", ["string", "string"]
        capability "Polling"
        capability "Refresh"
    }
    preferences {
        input "ip", "text", title: "Assistant relay IP Address", description: "IP Address in form 192.168.1.226", required: true, displayDuringSetup: true
        input "port", "text", title: "Assistant relay Port", description: "port in form of 8090", required: true, displayDuringSetup: true
        input "mac", "text", title: "Assistant relay MAC Addr", description: "MAC Address in form of 02A1B2C3D4E5", required: true, displayDuringSetup: true
    }

    tiles(scale: 2) {
        standardTile("refresh", "device.refresh", inactiveLabel: false, decoration: "flat", height: 2, width: 2) {
            state "default", action:"refresh.refresh", icon:"st.secondary.refresh"
        }
        main("refresh")
    }
}

def customBroadcast(text) {
	def eText = URLEncoder.encode(text, "UTF-8");
  //def eUser = URLEncoder.encode(user, "UTF-8");

  httpPostJSON("/customBroadcast?text=${eText}")
}

def broadcast(text) {
	def eText = URLEncoder.encode(text, "UTF-8");

  httpPostJSON("/broadcast?preset=${eText}")
}

def nestStartStream(camera, chromecast, user) {
	def eCam = URLEncoder.encode(camera, "UTF-8");
  def eChromecast = URLEncoder.encode(chromecast, "UTF-8");
  def eUser = URLEncoder.encode(user, "UTF-8");

  httpPostJSON("/nestStream?camera=${eCam}&chromecast=${eChromecast}&user=${eUser}")
}

def nestStopStream(chromecast) {
  def eChromecast = URLEncoder.encode(chromecast, "UTF-8");

  httpPostJSON("/nestStream?stop=true&chromecast=${eChromecast}")
}

def customCommand(command, user) {
	def eCommand = URLEncoder.encode(command, "UTF-8");
  def eUser = URLEncoder.encode(user, "UTF-8");

  httpPostJSON("/custom?command=${eCommand}&user=${eUser}")
}

def installed(){
    sendHubCommand(refresh() )
}
def updated(){
    sendHubCommand(refresh() )
}


// parse events into attributes
def parse(String description) {
    log.debug "Parsing '${description}'"
    def msg = parseLanMessage(description)
    log.debug "JSON: ${msg.json}"
}

def poll(){
    refresh()
}
def refresh(){

}

def httpPostJSON(path) {
    log.debug "Sending command ${path} to ${ip}:${port}@${mac}"
    def result = new physicalgraph.device.HubAction(
            method: "POST",
            path: path,
            headers: [
                    HOST: "$ip:$port"
            ],
            dni: mac
    )
    //log.debug "Request: ${result.requestId}"
    return result
}


/*private getCallBackAddress() {
    return "http://" + device.hub.getDataValue("localIP") + ":" + device.hub.getDataValue("localSrvPortTCP")
}*/

private getHostAddress() {
    return convertHexToIP(${ip}) + ":" + convertHexToInt(${port})
}

private Integer convertHexToInt(hex) {
    return Integer.parseInt(hex,16)
}

private String convertHexToIP(hex) {
    return [convertHexToInt(hex[0..1]),convertHexToInt(hex[2..3]),convertHexToInt(hex[4..5]),convertHexToInt(hex[6..7])].join(".")
}
